import {validateIntent,validateApplication,intentExpiry,canTransitionApplication,APPLICATION_STATUSES,normalizeWithdrawalReason} from './domain.mjs';
import {encryptPII,hashLookup,createTrackingToken,hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
async function body(req){try{return await req.json()}catch{return null}}

async function listJobs(env,url){
  const q=url.searchParams.get('q')?.trim();const dept=url.searchParams.get('department');const zone=url.searchParams.get('zone');
  let sql=`SELECT j.*, e.name employer_name, e.operator FROM jobs j LEFT JOIN employers e ON e.id=j.employer_id WHERE j.freshness_status!='expired'`;const binds=[];
  if(dept){sql+=' AND j.department=?';binds.push(dept)}
  if(zone){sql+=' AND j.zone=?';binds.push(zone)}
  if(q){sql+=' AND (j.title LIKE ? OR e.name LIKE ? OR j.department LIKE ?)';const like=`%${q}%`;binds.push(like,like,like)}
  sql+=' ORDER BY j.urgent DESC, j.last_seen_at DESC LIMIT 100';
  const result=await env.DB.prepare(sql).bind(...binds).all();return json({items:result.results||[]});
}
async function getJob(env,jobId){const row=await env.DB.prepare(`SELECT j.*, e.name employer_name, e.operator FROM jobs j LEFT JOIN employers e ON e.id=j.employer_id WHERE j.id=?`).bind(jobId).first();return row?json(row):json({error:'not_found'},404)}

async function recordEvent(env,{actorType='system',actorId=null,eventType,jobId=null,employerId=null,sourceChannel='direct',payload=null}){
  try{await env.DB.prepare(`INSERT INTO events(id,actor_type,actor_id,event_type,job_id,employer_id,source_channel,payload_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id('evt'),actorType,actorId,eventType,jobId,employerId,sourceChannel,payload?JSON.stringify(payload):null,now()).run()}catch{}
}

async function ensureGuest(env,{name,phone}){
  const ts=now();const guestId=id('gst');
  if(!phone){await env.DB.prepare(`INSERT INTO guest_profiles(id,created_at,updated_at) VALUES(?,?,?)`).bind(guestId,ts,ts).run();return guestId}
  const lookup=await hashLookup(phone,env.PII_KEY);const existing=await env.DB.prepare(`SELECT id FROM guest_profiles WHERE phone_hash=? LIMIT 1`).bind(lookup).first();if(existing?.id) return existing.id;
  const nameCipher=name?await encryptPII(name,env.PII_KEY):null;const phoneCipher=await encryptPII(phone,env.PII_KEY);
  await env.DB.prepare(`INSERT INTO guest_profiles(id,name_ciphertext,phone_ciphertext,phone_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)`).bind(guestId,nameCipher,phoneCipher,lookup,ts,ts).run();return guestId;
}

async function saveIntent(req,env){
  const raw=await body(req);const valid=validateIntent(raw);if(!valid.ok)return json({error:valid.error},400);
  const guestId=raw.guestId||await ensureGuest(env,{});const ts=now();const intentId=id('int');const expiresAt=intentExpiry(new Date(ts));
  await env.DB.prepare(`INSERT INTO candidate_intents(id,guest_id,job_id,intent,confirmed_at,expires_at,source_channel,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(intentId,guestId,valid.value.jobId,valid.value.intent,ts,expiresAt,valid.value.sourceChannel,ts,ts).run();
  await recordEvent(env,{actorType:'guest',actorId:guestId,eventType:'intent_confirmed',jobId:valid.value.jobId,sourceChannel:valid.value.sourceChannel,payload:{intent:valid.value.intent,intentId}});
  return json({ok:true,guestId,intentId,expiresAt},201);
}

async function apply(req,env){
  const raw=await body(req);const valid=validateApplication(raw);if(!valid.ok)return json({error:valid.error},400);
  const job=await env.DB.prepare(`SELECT id FROM jobs WHERE id=? AND freshness_status!='expired'`).bind(valid.value.jobId).first();if(!job)return json({error:'job_not_available'},409);
  const guestId=raw.guestId||await ensureGuest(env,{name:valid.value.name,phone:valid.value.phone});const ts=now();const applicationId=id('app');const trackingToken=createTrackingToken();const trackingHash=await hashTrackingToken(trackingToken);
  try{
    await env.DB.prepare(`INSERT INTO applications(id,guest_id,job_id,status,interview_preference,available_date,consent_scope,tracking_token_hash,status_changed_at,source_channel,submitted_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(applicationId,guestId,valid.value.jobId,'submitted',valid.value.interviewPreference,valid.value.availableDate,'this_employer_only',trackingHash,ts,valid.value.sourceChannel,ts,ts).run();
  }catch(e){if(String(e).includes('UNIQUE'))return json({error:'already_applied',guestId},409);throw e}
  await recordEvent(env,{actorType:'guest',actorId:guestId,eventType:'application_submitted',jobId:valid.value.jobId,sourceChannel:valid.value.sourceChannel,payload:{applicationId,status:'submitted'}});
  return json({ok:true,applicationId,guestId,status:'submitted',trackingToken},201);
}

async function applicationByToken(env,applicationId,token){
  if(!token)return null;const tokenHash=await hashTrackingToken(token);
  return env.DB.prepare(`SELECT a.id,a.guest_id,a.job_id,a.status,a.submitted_at,a.updated_at,a.status_changed_at,a.withdrawn_at,a.withdrawal_reason,j.title,e.name employer_name FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN employers e ON e.id=j.employer_id WHERE a.id=? AND a.tracking_token_hash=?`).bind(applicationId,tokenHash).first();
}
async function getApplicationStatus(env,applicationId,url){
  const row=await applicationByToken(env,applicationId,url.searchParams.get('token'));if(!row)return json({error:'not_found'},404);
  return json({id:row.id,jobId:row.job_id,title:row.title,employer:row.employer_name,status:row.status,submittedAt:row.submitted_at,statusChangedAt:row.status_changed_at,withdrawnAt:row.withdrawn_at,withdrawalReason:row.withdrawal_reason});
}
async function withdrawApplication(req,env,applicationId){
  const raw=await body(req);const row=await applicationByToken(env,applicationId,raw?.token);if(!row)return json({error:'not_found'},404);
  if(row.status==='withdrawn')return json({ok:true,status:'withdrawn'});
  if(!canTransitionApplication(row.status,'withdrawn'))return json({error:'status_closed',status:row.status},409);
  const ts=now();const reason=normalizeWithdrawalReason(raw?.reason);
  await env.DB.prepare(`UPDATE applications SET status='withdrawn',withdrawn_at=?,withdrawal_reason=?,status_changed_at=?,updated_at=? WHERE id=?`).bind(ts,reason,ts,ts,applicationId).run();
  await recordEvent(env,{actorType:'guest',actorId:row.guest_id,eventType:'application_withdrawn',jobId:row.job_id,payload:{applicationId,from:row.status,to:'withdrawn',reason}});
  return json({ok:true,status:'withdrawn',withdrawnAt:ts});
}

function internalAuthorized(req,env){
  const expected=env.INTERNAL_API_TOKEN;if(!expected)return false;
  const auth=req.headers.get('authorization')||'';return auth===`Bearer ${expected}`;
}
async function internalUpdateStatus(req,env,applicationId){
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);
  const raw=await body(req);const to=String(raw?.status||'');if(!APPLICATION_STATUSES.has(to))return json({error:'invalid_status'},400);
  const row=await env.DB.prepare(`SELECT id,guest_id,job_id,status FROM applications WHERE id=?`).bind(applicationId).first();if(!row)return json({error:'not_found'},404);
  if(!canTransitionApplication(row.status,to))return json({error:'invalid_transition',from:row.status,to},409);
  const ts=now();await env.DB.prepare(`UPDATE applications SET status=?,status_changed_at=?,updated_at=? WHERE id=?`).bind(to,ts,ts,applicationId).run();
  await recordEvent(env,{eventType:'application_status_changed',jobId:row.job_id,payload:{applicationId,from:row.status,to}});
  return json({ok:true,id:applicationId,from:row.status,status:to,statusChangedAt:ts});
}
async function internalFunnel(req,env){
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);
  const apps=await env.DB.prepare(`SELECT source_channel,status,COUNT(*) count FROM applications GROUP BY source_channel,status ORDER BY source_channel,status`).all();
  const intents=await env.DB.prepare(`SELECT source_channel,intent,COUNT(*) count FROM candidate_intents WHERE paused_at IS NULL AND expires_at>? GROUP BY source_channel,intent ORDER BY source_channel,intent`).bind(now()).all();
  return json({applications:apps.results||[],activeIntents:intents.results||[]});
}

export default {async fetch(req,env){
  const url=new URL(req.url);if(url.pathname==='/api/health')return json({ok:true,service:'phuquoc-careers-api'});
  if(req.method==='GET'&&url.pathname==='/api/jobs')return listJobs(env,url);
  const jobMatch=url.pathname.match(/^\/api\/jobs\/([^/]+)$/);if(req.method==='GET'&&jobMatch)return getJob(env,decodeURIComponent(jobMatch[1]));
  if(req.method==='POST'&&url.pathname==='/api/intent')return saveIntent(req,env);
  if(req.method==='POST'&&url.pathname==='/api/applications')return apply(req,env);
  const appStatus=url.pathname.match(/^\/api\/applications\/([^/]+)$/);if(req.method==='GET'&&appStatus)return getApplicationStatus(env,decodeURIComponent(appStatus[1]),url);
  const appWithdraw=url.pathname.match(/^\/api\/applications\/([^/]+)\/withdraw$/);if(req.method==='POST'&&appWithdraw)return withdrawApplication(req,env,decodeURIComponent(appWithdraw[1]));
  const internalStatus=url.pathname.match(/^\/api\/internal\/applications\/([^/]+)\/status$/);if(req.method==='PATCH'&&internalStatus)return internalUpdateStatus(req,env,decodeURIComponent(internalStatus[1]));
  if(req.method==='GET'&&url.pathname==='/api/internal/analytics/funnel')return internalFunnel(req,env);
  return json({error:'not_found'},404);
}}
