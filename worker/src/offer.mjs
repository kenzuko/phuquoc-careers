import {hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
const RESPONSES=new Set(['accepted','considering','waiting_other_offer','declined']);
const REASONS=new Set(['salary','housing','shift','transport','days_off','family','current_job','other']);
async function body(req){try{return await req.json()}catch{return null}}
async function record(env,{actorType='system',actorId=null,eventType,jobId=null,employerId=null,payload=null}){try{await env.DB.prepare(`INSERT INTO events(id,actor_type,actor_id,event_type,job_id,employer_id,source_channel,payload_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id('evt'),actorType,actorId,eventType,jobId,employerId,'direct',payload?JSON.stringify(payload):null,now()).run()}catch{}}
async function applicationByTracking(req,env,applicationId){const token=req.headers.get('x-pqc-tracking-token');if(!token)return null;const hash=await hashTrackingToken(token);return env.DB.prepare(`SELECT a.id,a.guest_id,a.job_id,a.status,a.offer_response,a.offer_response_reason,a.offer_response_at,j.employer_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND a.tracking_token_hash=? LIMIT 1`).bind(applicationId,hash).first()}
async function hrSession(req,env){const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))return null;const token=auth.slice(7).trim();if(!token)return null;const hash=await hashTrackingToken(token);return env.DB.prepare(`SELECT s.hr_identity_id FROM employer_sessions s JOIN hr_identities i ON i.id=s.hr_identity_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND i.verification_status='verified' LIMIT 1`).bind(hash,now()).first()}
async function hrApplication(req,env,applicationId){const session=await hrSession(req,env);if(!session)return {error:json({error:'unauthorized'},401)};const row=await env.DB.prepare(`SELECT a.id,a.job_id,a.status,a.offer_response,a.offer_response_reason,a.offer_response_at,j.employer_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? LIMIT 1`).bind(applicationId).first();if(!row)return {error:json({error:'not_found'},404)};const membership=await env.DB.prepare(`SELECT role FROM employer_memberships WHERE hr_identity_id=? AND employer_id=? AND status='active' LIMIT 1`).bind(session.hr_identity_id,row.employer_id).first();if(!membership)return {error:json({error:'forbidden'},403)};return {session,row,membership}}
const view=row=>({applicationId:row.id,status:row.status,response:row.offer_response||null,reason:row.offer_response_reason||null,responseAt:row.offer_response_at||null});
async function candidateGet(req,env,applicationId){const row=await applicationByTracking(req,env,applicationId);return row?json(view(row)):json({error:'not_found'},404)}
async function candidateRespond(req,env,applicationId){
  if(env.CANDIDATE_WRITES_ENABLED!=='true')return json({error:'feature_not_enabled',feature:'candidate_writes'},503);
  const row=await applicationByTracking(req,env,applicationId);if(!row)return json({error:'not_found'},404);if(row.status!=='offer')return json({error:'not_in_offer',status:row.status},409);
  const raw=await body(req);const response=String(raw?.response||'');if(!RESPONSES.has(response))return json({error:'response_invalid'},400);let reason=null;if(raw?.reason){reason=String(raw.reason);if(!REASONS.has(reason))return json({error:'reason_invalid'},400)}if(response==='declined'&&!reason)reason='other';
  const ts=now();await env.DB.prepare(`UPDATE applications SET offer_response=?,offer_response_reason=?,offer_response_at=?,updated_at=? WHERE id=?`).bind(response,reason,ts,ts,applicationId).run();
  await record(env,{actorType:'guest',actorId:row.guest_id,eventType:'offer_response',jobId:row.job_id,employerId:row.employer_id,payload:{applicationId,response,reason}});return json({ok:true,...view({...row,offer_response:response,offer_response_reason:reason,offer_response_at:ts})});
}
async function hrGet(req,env,applicationId){const found=await hrApplication(req,env,applicationId);if(found.error)return found.error;return json({...view(found.row),role:found.membership.role})}

export async function offerRoute(req,env,url){
  let m=url.pathname.match(/^\/api\/applications\/([^/]+)\/offer$/);if(m&&req.method==='GET')return candidateGet(req,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/applications\/([^/]+)\/offer-response$/);if(m&&req.method==='POST')return candidateRespond(req,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/hr\/applications\/([^/]+)\/offer$/);if(m&&req.method==='GET')return hrGet(req,env,decodeURIComponent(m[1]));
  return null;
}
