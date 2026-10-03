import {hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
const addDays=(iso,days)=>new Date(new Date(iso).getTime()+days*86400000).toISOString();
async function body(req){try{return await req.json()}catch{return null}}
function internalAuthorized(req,env){const expected=env.INTERNAL_API_TOKEN;if(!expected)return false;return (req.headers.get('authorization')||'')===`Bearer ${expected}`}

async function applicationByTracking(req,env,applicationId){
  const token=req.headers.get('x-pqc-tracking-token');if(!token)return null;
  const hash=await hashTrackingToken(token);
  return env.DB.prepare(`SELECT a.id,a.guest_id,a.job_id,a.status,a.status_changed_at,a.tracking_token_hash,j.employer_id,j.title,e.name employer_name FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN employers e ON e.id=j.employer_id WHERE a.id=? AND a.tracking_token_hash=? LIMIT 1`).bind(applicationId,hash).first();
}

async function hrSession(req,env){
  const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))return null;
  const token=auth.slice(7).trim();if(!token)return null;const hash=await hashTrackingToken(token);
  return env.DB.prepare(`SELECT s.hr_identity_id FROM employer_sessions s JOIN hr_identities i ON i.id=s.hr_identity_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND i.verification_status='verified' LIMIT 1`).bind(hash,now()).first();
}

async function hrApplication(req,env,applicationId){
  const session=await hrSession(req,env);if(!session)return {error:json({error:'unauthorized'},401)};
  const row=await env.DB.prepare(`SELECT a.id,a.guest_id,a.job_id,a.status,a.status_changed_at,j.employer_id,j.title FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? LIMIT 1`).bind(applicationId).first();
  if(!row)return {error:json({error:'not_found'},404)};
  const membership=await env.DB.prepare(`SELECT role FROM employer_memberships WHERE hr_identity_id=? AND employer_id=? AND status='active' LIMIT 1`).bind(session.hr_identity_id,row.employer_id).first();
  if(!membership)return {error:json({error:'forbidden'},403)};
  return {session,row,membership};
}

async function checkins(env,applicationId){
  const rows=await env.DB.prepare(`SELECT window_days,response,reason,responded_at FROM retention_checkins WHERE application_id=? ORDER BY window_days`).bind(applicationId).all();
  return rows.results||[];
}

function retentionView(row,items){
  const joinedAt=row.status==='joined'?row.status_changed_at:null;
  const windows=joinedAt?[30,90].map(days=>({days,dueAt:addDays(joinedAt,days),response:items.find(x=>Number(x.window_days)===days)||null})):[];
  return {applicationId:row.id,status:row.status,joinedAt,windows};
}

async function candidateGet(req,env,applicationId){
  const row=await applicationByTracking(req,env,applicationId);if(!row)return json({error:'not_found'},404);
  return json(retentionView(row,await checkins(env,applicationId)));
}

async function candidateRespond(req,env,applicationId,windowDays){
  if(env.CANDIDATE_WRITES_ENABLED!=='true')return json({error:'feature_not_enabled',feature:'candidate_writes'},503);
  if(![30,90].includes(windowDays))return json({error:'window_invalid'},400);
  const row=await applicationByTracking(req,env,applicationId);if(!row)return json({error:'not_found'},404);
  if(row.status!=='joined'||!row.status_changed_at)return json({error:'not_joined',status:row.status},409);
  const dueAt=addDays(row.status_changed_at,windowDays);if(Date.now()<new Date(dueAt).getTime())return json({error:'checkin_not_due',dueAt},409);
  const raw=await body(req);const response=String(raw?.response||'');if(!['still_working','left','prefer_not_to_say'].includes(response))return json({error:'response_invalid'},400);
  const reasonRaw=String(raw?.reason||'');const allowed=new Set(['salary','schedule','location_transport','role_fit','culture','management','personal','other']);
  const reason=response==='left'?(allowed.has(reasonRaw)?reasonRaw:'other'):null;
  const ts=now();const checkinId=id('ret');
  await env.DB.prepare(`INSERT INTO retention_checkins(id,application_id,guest_id,window_days,response,reason,responded_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(application_id,window_days) DO UPDATE SET response=excluded.response,reason=excluded.reason,responded_at=excluded.responded_at,updated_at=excluded.updated_at`).bind(checkinId,applicationId,row.guest_id,windowDays,response,reason,ts,ts,ts).run();
  try{await env.DB.prepare(`INSERT INTO events(id,actor_type,actor_id,event_type,job_id,employer_id,source_channel,payload_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id('evt'),'guest',row.guest_id,'retention_checkin',row.job_id,row.employer_id,'direct',JSON.stringify({applicationId,windowDays,response,reason}),ts).run()}catch{}
  return json({ok:true,applicationId,windowDays,response,reason,respondedAt:ts});
}

async function hrGet(req,env,applicationId){
  const found=await hrApplication(req,env,applicationId);if(found.error)return found.error;
  return json({...retentionView(found.row,await checkins(env,applicationId)),role:found.membership.role});
}

async function syncRetentionOutbox(req,env){
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);
  const rows=await env.DB.prepare(`SELECT a.id application_id,a.guest_id,a.status_changed_at joined_at FROM applications a WHERE a.status='joined' AND a.status_changed_at IS NOT NULL`).all();
  let inserted=0;const ts=now();
  for(const row of rows.results||[]){
    for(const days of [30,90]){
      const outId=id('out');const result=await env.DB.prepare(`INSERT OR IGNORE INTO notification_outbox(id,recipient_type,recipient_ref,channel_hint,template_key,entity_type,entity_id,scheduled_at,status,attempt_count,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(outId,'guest',row.guest_id,'unknown',`retention_${days}d`,'application',row.application_id,addDays(row.joined_at,days),'pending',0,ts,ts).run();
      inserted+=Number(result?.meta?.changes||0);
    }
  }
  return json({ok:true,joinedApplications:(rows.results||[]).length,inserted});
}

async function listOutbox(req,env,url){
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);
  const status=String(url.searchParams.get('status')||'pending');const allowed=new Set(['pending','leased','sent','failed','cancelled']);if(!allowed.has(status))return json({error:'status_invalid'},400);
  const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||50),1),200);
  const due=url.searchParams.get('due')==='1';let sql=`SELECT id,recipient_type,recipient_ref,channel_hint,template_key,entity_type,entity_id,scheduled_at,status,attempt_count,last_error_code,sent_at,created_at,updated_at FROM notification_outbox WHERE status=?`;const binds=[status];
  if(due){sql+=' AND scheduled_at<=?';binds.push(now())}sql+=' ORDER BY scheduled_at LIMIT ?';binds.push(limit);
  const rows=await env.DB.prepare(sql).bind(...binds).all();return json({items:rows.results||[]});
}

async function updateOutbox(req,env,outboxId){
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);
  const raw=await body(req);const status=String(raw?.status||'');if(!['leased','sent','failed','cancelled'].includes(status))return json({error:'status_invalid'},400);
  const row=await env.DB.prepare(`SELECT id,status,attempt_count FROM notification_outbox WHERE id=?`).bind(outboxId).first();if(!row)return json({error:'not_found'},404);
  const ts=now();const errorCode=status==='failed'?String(raw?.errorCode||'provider_error').slice(0,80):null;const sentAt=status==='sent'?ts:null;
  await env.DB.prepare(`UPDATE notification_outbox SET status=?,attempt_count=attempt_count+1,last_error_code=?,sent_at=COALESCE(?,sent_at),updated_at=? WHERE id=?`).bind(status,errorCode,sentAt,ts,outboxId).run();
  return json({ok:true,id:outboxId,status,updatedAt:ts});
}

export async function retentionRoute(req,env,url){
  let m=url.pathname.match(/^\/api\/applications\/([^/]+)\/retention$/);if(m&&req.method==='GET')return candidateGet(req,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/applications\/([^/]+)\/retention\/(30|90)$/);if(m&&req.method==='POST')return candidateRespond(req,env,decodeURIComponent(m[1]),Number(m[2]));
  m=url.pathname.match(/^\/api\/hr\/applications\/([^/]+)\/retention$/);if(m&&req.method==='GET')return hrGet(req,env,decodeURIComponent(m[1]));
  if(req.method==='POST'&&url.pathname==='/api/internal/notifications/sync-retention')return syncRetentionOutbox(req,env);
  if(req.method==='GET'&&url.pathname==='/api/internal/notifications/outbox')return listOutbox(req,env,url);
  m=url.pathname.match(/^\/api\/internal\/notifications\/outbox\/([^/]+)$/);if(m&&req.method==='PATCH')return updateOutbox(req,env,decodeURIComponent(m[1]));
  return null;
}
