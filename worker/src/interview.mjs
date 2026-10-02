import {hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
async function body(req){try{return await req.json()}catch{return null}}
function iso(value,{future=false}={}){if(!value)return null;const d=new Date(String(value));if(Number.isNaN(d.getTime()))return null;if(future&&d.getTime()<Date.now()-30*60*1000)return null;if(d.getTime()>Date.now()+180*24*3600*1000)return null;return d.toISOString()}
async function record(env,{actorType='system',actorId=null,eventType,jobId=null,employerId=null,payload=null}){try{await env.DB.prepare(`INSERT INTO events(id,actor_type,actor_id,event_type,job_id,employer_id,source_channel,payload_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id('evt'),actorType,actorId,eventType,jobId,employerId,'direct',payload?JSON.stringify(payload):null,now()).run()}catch{}}

async function applicationByTracking(req,env,applicationId){const token=req.headers.get('x-pqc-tracking-token');if(!token)return null;const hash=await hashTrackingToken(token);return env.DB.prepare(`SELECT a.id,a.guest_id,a.job_id,a.status,a.interview_scheduled_at,a.interview_response,a.interview_response_at,a.interview_proposed_at,j.employer_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND a.tracking_token_hash=? LIMIT 1`).bind(applicationId,hash).first()}
async function hrSession(req,env){const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))return null;const token=auth.slice(7).trim();if(!token)return null;const hash=await hashTrackingToken(token);return env.DB.prepare(`SELECT s.hr_identity_id FROM employer_sessions s JOIN hr_identities i ON i.id=s.hr_identity_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND i.verification_status='verified' LIMIT 1`).bind(hash,now()).first()}
async function hrApplication(req,env,applicationId){const session=await hrSession(req,env);if(!session)return {error:json({error:'unauthorized'},401)};const row=await env.DB.prepare(`SELECT a.id,a.job_id,a.status,a.interview_scheduled_at,a.interview_response,a.interview_response_at,a.interview_proposed_at,j.employer_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? LIMIT 1`).bind(applicationId).first();if(!row)return {error:json({error:'not_found'},404)};const membership=await env.DB.prepare(`SELECT role FROM employer_memberships WHERE hr_identity_id=? AND employer_id=? AND status='active' LIMIT 1`).bind(session.hr_identity_id,row.employer_id).first();if(!membership)return {error:json({error:'forbidden'},403)};return {session,row,membership}}
function view(row){return {applicationId:row.id,status:row.status,scheduledAt:row.interview_scheduled_at||null,response:row.interview_response||null,responseAt:row.interview_response_at||null,proposedAt:row.interview_proposed_at||null}}

async function candidateGet(req,env,applicationId){const row=await applicationByTracking(req,env,applicationId);return row?json(view(row)):json({error:'not_found'},404)}
async function candidateRespond(req,env,applicationId){
  if(env.CANDIDATE_WRITES_ENABLED!=='true')return json({error:'feature_not_enabled',feature:'candidate_writes'},503);
  const row=await applicationByTracking(req,env,applicationId);if(!row)return json({error:'not_found'},404);if(row.status!=='interview')return json({error:'not_in_interview',status:row.status},409);
  const raw=await body(req);const response=String(raw?.response||'');if(!['confirmed','reschedule','cannot_attend'].includes(response))return json({error:'response_invalid'},400);
  let proposedAt=null;if(response==='reschedule'&&raw?.proposedAt){proposedAt=iso(raw.proposedAt,{future:true});if(!proposedAt)return json({error:'proposed_time_invalid'},400)}
  const ts=now();await env.DB.prepare(`UPDATE applications SET interview_response=?,interview_response_at=?,interview_proposed_at=?,updated_at=? WHERE id=?`).bind(response,ts,proposedAt,ts,applicationId).run();
  await record(env,{actorType:'guest',actorId:row.guest_id,eventType:'interview_response',jobId:row.job_id,employerId:row.employer_id,payload:{applicationId,response,proposedAt}});return json({ok:true,...view({...row,interview_response:response,interview_response_at:ts,interview_proposed_at:proposedAt})});
}
async function hrGet(req,env,applicationId){const found=await hrApplication(req,env,applicationId);if(found.error)return found.error;return json({...view(found.row),role:found.membership.role})}
async function hrSchedule(req,env,applicationId){
  if(env.HR_WORKSPACE_ENABLED!=='true')return json({error:'feature_not_enabled',feature:'hr_workspace'},503);
  const found=await hrApplication(req,env,applicationId);if(found.error)return found.error;if(found.membership.role==='viewer')return json({error:'forbidden'},403);if(found.row.status!=='interview')return json({error:'not_in_interview',status:found.row.status},409);
  const raw=await body(req);const scheduledAt=iso(raw?.scheduledAt,{future:true});if(!scheduledAt)return json({error:'scheduled_time_invalid'},400);const ts=now();
  await env.DB.prepare(`UPDATE applications SET interview_scheduled_at=?,interview_response=NULL,interview_response_at=NULL,interview_proposed_at=NULL,updated_at=? WHERE id=?`).bind(scheduledAt,ts,applicationId).run();
  await record(env,{actorType:'hr_identity',actorId:found.session.hr_identity_id,eventType:'interview_scheduled',jobId:found.row.job_id,employerId:found.row.employer_id,payload:{applicationId,scheduledAt}});return json({ok:true,applicationId,status:'interview',scheduledAt,response:null});
}

export async function interviewRoute(req,env,url){
  let m=url.pathname.match(/^\/api\/applications\/([^/]+)\/interview$/);if(m&&req.method==='GET')return candidateGet(req,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/applications\/([^/]+)\/interview-response$/);if(m&&req.method==='POST')return candidateRespond(req,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/hr\/applications\/([^/]+)\/interview$/);if(m&&req.method==='GET')return hrGet(req,env,decodeURIComponent(m[1]));
  if(m&&req.method==='PATCH')return hrSchedule(req,env,decodeURIComponent(m[1]));
  return null;
}
