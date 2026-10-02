import {validateIntent,validateApplication,validateEmployerClaim,intentExpiry,canTransitionApplication,APPLICATION_STATUSES,normalizeWithdrawalReason} from './domain.mjs';
import {encryptPII,decryptPII,hashLookup,createTrackingToken,hashTrackingToken} from './crypto.mjs';

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
async function getApplicationStatus(req,env,applicationId){
  const token=req.headers.get('x-pqc-tracking-token');const row=await applicationByToken(env,applicationId,token);if(!row)return json({error:'not_found'},404);
  return json({id:row.id,jobId:row.job_id,title:row.title,employer:row.employer_name,status:row.status,submittedAt:row.submitted_at,statusChangedAt:row.status_changed_at,withdrawnAt:row.withdrawn_at,withdrawalReason:row.withdrawal_reason});
}
async function withdrawApplication(req,env,applicationId){
  const raw=await body(req);const token=req.headers.get('x-pqc-tracking-token');const row=await applicationByToken(env,applicationId,token);if(!row)return json({error:'not_found'},404);
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

async function submitEmployerClaim(req,env){
  const raw=await body(req);const valid=validateEmployerClaim(raw);if(!valid.ok)return json({error:valid.error},400);
  const employer=await env.DB.prepare(`SELECT id,name,claim_status FROM employers WHERE lower(name)=lower(?) LIMIT 1`).bind(valid.value.employerName).first();
  if(!employer)return json({error:'employer_not_found'},404);
  const ts=now();const claimId=id('clm');const emailHash=await hashLookup(valid.value.email,env.PII_KEY);const emailCipher=await encryptPII(valid.value.email,env.PII_KEY);
  const existing=await env.DB.prepare(`SELECT id,status FROM employer_claims WHERE employer_id=? AND email_hash=? AND status='pending' LIMIT 1`).bind(employer.id,emailHash).first();
  if(existing)return json({ok:true,claimId:existing.id,status:'pending',duplicate:true},200);
  await env.DB.prepare(`INSERT INTO employer_claims(id,employer_id,requested_role,email_ciphertext,email_hash,email_domain,verification_method,proof_url,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(claimId,employer.id,valid.value.role,emailCipher,emailHash,valid.value.emailDomain,valid.value.method,valid.value.proofUrl,'pending',ts,ts).run();
  if(employer.claim_status!=='verified')await env.DB.prepare(`UPDATE employers SET claim_status='pending',updated_at=? WHERE id=?`).bind(ts,employer.id).run();
  await recordEvent(env,{eventType:'employer_claim_submitted',employerId:employer.id,payload:{claimId,verificationMethod:valid.value.method,requestedRole:valid.value.role}});
  return json({ok:true,claimId,status:'pending',verificationMethod:valid.value.method,employer:employer.name},201);
}

async function internalReviewClaim(req,env,claimId){
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);
  const raw=await body(req);const decision=String(raw?.decision||'');if(!['approved','rejected'].includes(decision))return json({error:'invalid_decision'},400);
  const claim=await env.DB.prepare(`SELECT * FROM employer_claims WHERE id=?`).bind(claimId).first();if(!claim)return json({error:'not_found'},404);if(claim.status!=='pending')return json({error:'claim_closed',status:claim.status},409);
  const ts=now();
  if(decision==='rejected'){
    await env.DB.prepare(`UPDATE employer_claims SET status='rejected',reviewed_at=?,updated_at=? WHERE id=?`).bind(ts,ts,claimId).run();
    await env.DB.prepare(`UPDATE employers SET claim_status=CASE WHEN claim_status='verified' THEN 'verified' ELSE 'unclaimed' END,updated_at=? WHERE id=?`).bind(ts,claim.employer_id).run();
    await recordEvent(env,{eventType:'employer_claim_rejected',employerId:claim.employer_id,payload:{claimId}});
    return json({ok:true,claimId,status:'rejected'});
  }
  let identity=await env.DB.prepare(`SELECT id FROM hr_identities WHERE email_hash=? LIMIT 1`).bind(claim.email_hash).first();
  if(!identity){
    identity={id:id('hr')};
    await env.DB.prepare(`INSERT INTO hr_identities(id,email_ciphertext,email_hash,email_domain,verification_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).bind(identity.id,claim.email_ciphertext,claim.email_hash,claim.email_domain,'verified',ts,ts).run();
  }else{
    await env.DB.prepare(`UPDATE hr_identities SET verification_status='verified',email_domain=?,updated_at=? WHERE id=?`).bind(claim.email_domain,ts,identity.id).run();
  }
  const membershipId=id('mem');
  await env.DB.prepare(`INSERT INTO employer_memberships(id,hr_identity_id,employer_id,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(hr_identity_id,employer_id) DO UPDATE SET role=excluded.role,status='active',updated_at=excluded.updated_at`).bind(membershipId,identity.id,claim.employer_id,claim.requested_role,'active',ts,ts).run();
  await env.DB.prepare(`UPDATE employer_claims SET status='approved',reviewed_at=?,updated_at=? WHERE id=?`).bind(ts,ts,claimId).run();
  await env.DB.prepare(`UPDATE employers SET claim_status='verified',updated_at=? WHERE id=?`).bind(ts,claim.employer_id).run();
  await recordEvent(env,{actorType:'hr_identity',actorId:identity.id,eventType:'employer_claim_approved',employerId:claim.employer_id,payload:{claimId,role:claim.requested_role}});
  return json({ok:true,claimId,status:'approved',hrIdentityId:identity.id,employerId:claim.employer_id});
}

async function internalMintEmployerSession(req,env,hrIdentityId){
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);
  const identity=await env.DB.prepare(`SELECT id,verification_status FROM hr_identities WHERE id=?`).bind(hrIdentityId).first();if(!identity)return json({error:'not_found'},404);if(identity.verification_status!=='verified')return json({error:'identity_not_verified'},409);
  const hours=Math.min(Math.max(Number(env.HR_SESSION_HOURS||12),1),168);const expires=new Date(Date.now()+hours*3600000).toISOString();const token=createTrackingToken();const tokenHash=await hashTrackingToken(token);const sessionId=id('hrs');const ts=now();
  await env.DB.prepare(`INSERT INTO employer_sessions(id,hr_identity_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)`).bind(sessionId,hrIdentityId,tokenHash,expires,ts).run();
  return json({ok:true,sessionId,token,expiresAt:expires},201);
}

async function hrSession(req,env){
  const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))return null;const raw=auth.slice(7).trim();if(!raw)return null;const tokenHash=await hashTrackingToken(raw);
  const row=await env.DB.prepare(`SELECT s.id session_id,s.hr_identity_id,i.verification_status FROM employer_sessions s JOIN hr_identities i ON i.id=s.hr_identity_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? LIMIT 1`).bind(tokenHash,now()).first();
  if(!row||row.verification_status!=='verified')return null;try{await env.DB.prepare(`UPDATE employer_sessions SET last_used_at=? WHERE id=?`).bind(now(),row.session_id).run()}catch{}
  return row;
}
async function requireHr(req,env){const session=await hrSession(req,env);return session||null}
async function activeMembership(env,hrIdentityId,employerId){return env.DB.prepare(`SELECT id,role FROM employer_memberships WHERE hr_identity_id=? AND employer_id=? AND status='active' LIMIT 1`).bind(hrIdentityId,employerId).first()}

async function hrMe(req,env){
  const session=await requireHr(req,env);if(!session)return json({error:'unauthorized'},401);
  const rows=await env.DB.prepare(`SELECT m.id membership_id,m.role,e.id employer_id,e.name employer_name,e.operator FROM employer_memberships m JOIN employers e ON e.id=m.employer_id WHERE m.hr_identity_id=? AND m.status='active' ORDER BY e.name`).bind(session.hr_identity_id).all();
  return json({hrIdentityId:session.hr_identity_id,employers:rows.results||[]});
}
async function hrJobs(req,env){
  const session=await requireHr(req,env);if(!session)return json({error:'unauthorized'},401);
  const rows=await env.DB.prepare(`SELECT j.*,e.name employer_name,m.role membership_role FROM employer_memberships m JOIN employers e ON e.id=m.employer_id JOIN jobs j ON j.employer_id=e.id WHERE m.hr_identity_id=? AND m.status='active' AND j.freshness_status!='expired' ORDER BY e.name,j.last_seen_at DESC`).bind(session.hr_identity_id).all();
  return json({items:rows.results||[]});
}
async function hrJobDrafts(req,env){
  const session=await requireHr(req,env);if(!session)return json({error:'unauthorized'},401);
  if(req.method==='GET'){
    const rows=await env.DB.prepare(`SELECT d.*,e.name employer_name,m.role membership_role FROM job_drafts d JOIN employers e ON e.id=d.employer_id JOIN employer_memberships m ON m.employer_id=d.employer_id AND m.hr_identity_id=? AND m.status='active' WHERE d.hr_identity_id=? ORDER BY d.updated_at DESC LIMIT 100`).bind(session.hr_identity_id,session.hr_identity_id).all();
    return json({items:rows.results||[]});
  }
  const raw=await body(req);const employerId=String(raw?.employerId||'');const inputType=String(raw?.inputType||'');const parsed=raw?.parsed||{};
  if(!employerId)return json({error:'employer_required'},400);if(!['text','url','poster'].includes(inputType))return json({error:'input_type_invalid'},400);if(!String(parsed.title||'').trim())return json({error:'title_required'},400);
  const membership=await activeMembership(env,session.hr_identity_id,employerId);if(!membership||membership.role==='viewer')return json({error:'forbidden'},403);
  const draftId=id('drf');const ts=now();const house=parsed.staffHouseState==='mentioned'?'mentioned':'unknown';const service=parsed.serviceChargeState==='mentioned'?'mentioned':'unknown';const parserStatus=inputType==='poster'?'needs_parser':'parsed';
  await env.DB.prepare(`INSERT INTO job_drafts(id,hr_identity_id,employer_id,input_type,source_url,upload_name,raw_text,title,department,experience,salary_text,staff_house_state,service_charge_state,off_days_text,parser_status,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(draftId,session.hr_identity_id,employerId,inputType,raw?.sourceUrl||null,raw?.uploadName||null,raw?.rawText||null,String(parsed.title).trim(),parsed.department||null,parsed.experience||null,parsed.salary||null,house,service,parsed.offDays||null,parserStatus,'draft',ts,ts).run();
  await recordEvent(env,{actorType:'hr_identity',actorId:session.hr_identity_id,eventType:'job_draft_created',employerId,payload:{draftId,inputType,parserStatus}});
  return json({ok:true,draftId,status:'draft',parserStatus},201);
}
async function hrJobApplications(req,env,jobId){
  const session=await requireHr(req,env);if(!session)return json({error:'unauthorized'},401);
  const job=await env.DB.prepare(`SELECT id,employer_id,title FROM jobs WHERE id=?`).bind(jobId).first();if(!job)return json({error:'not_found'},404);
  const membership=await activeMembership(env,session.hr_identity_id,job.employer_id);if(!membership)return json({error:'forbidden'},403);
  const rows=await env.DB.prepare(`SELECT a.id,a.status,a.interview_preference,a.available_date,a.source_channel,a.submitted_at,a.status_changed_at,g.name_ciphertext,g.phone_ciphertext FROM applications a JOIN guest_profiles g ON g.id=a.guest_id WHERE a.job_id=? ORDER BY a.submitted_at DESC LIMIT 200`).bind(jobId).all();
  const items=[];for(const r of rows.results||[]){items.push({id:r.id,status:r.status,interviewPreference:r.interview_preference,availableDate:r.available_date,sourceChannel:r.source_channel,submittedAt:r.submitted_at,statusChangedAt:r.status_changed_at,name:r.name_ciphertext?await decryptPII(r.name_ciphertext,env.PII_KEY):null,phone:r.phone_ciphertext?await decryptPII(r.phone_ciphertext,env.PII_KEY):null})}
  return json({job:{id:job.id,title:job.title},role:membership.role,items});
}
async function hrUpdateStatus(req,env,applicationId){
  const session=await requireHr(req,env);if(!session)return json({error:'unauthorized'},401);
  const raw=await body(req);const to=String(raw?.status||'');if(!APPLICATION_STATUSES.has(to))return json({error:'invalid_status'},400);
  const row=await env.DB.prepare(`SELECT a.id,a.guest_id,a.job_id,a.status,j.employer_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=?`).bind(applicationId).first();if(!row)return json({error:'not_found'},404);
  const membership=await activeMembership(env,session.hr_identity_id,row.employer_id);if(!membership)return json({error:'forbidden'},403);if(membership.role==='viewer')return json({error:'forbidden'},403);
  if(!canTransitionApplication(row.status,to))return json({error:'invalid_transition',from:row.status,to},409);
  const ts=now();await env.DB.prepare(`UPDATE applications SET status=?,status_changed_at=?,updated_at=? WHERE id=?`).bind(to,ts,ts,applicationId).run();
  await recordEvent(env,{actorType:'hr_identity',actorId:session.hr_identity_id,eventType:'application_status_changed',jobId:row.job_id,employerId:row.employer_id,payload:{applicationId,from:row.status,to}});
  return json({ok:true,id:applicationId,from:row.status,status:to,statusChangedAt:ts});
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
  if(req.method==='POST'&&url.pathname==='/api/employer-claims')return submitEmployerClaim(req,env);
  const appStatus=url.pathname.match(/^\/api\/applications\/([^/]+)$/);if(req.method==='GET'&&appStatus)return getApplicationStatus(req,env,decodeURIComponent(appStatus[1]));
  const appWithdraw=url.pathname.match(/^\/api\/applications\/([^/]+)\/withdraw$/);if(req.method==='POST'&&appWithdraw)return withdrawApplication(req,env,decodeURIComponent(appWithdraw[1]));
  if(req.method==='GET'&&url.pathname==='/api/hr/me')return hrMe(req,env);
  if(req.method==='GET'&&url.pathname==='/api/hr/jobs')return hrJobs(req,env);
  if((req.method==='GET'||req.method==='POST')&&url.pathname==='/api/hr/job-drafts')return hrJobDrafts(req,env);
  const hrJobApps=url.pathname.match(/^\/api\/hr\/jobs\/([^/]+)\/applications$/);if(req.method==='GET'&&hrJobApps)return hrJobApplications(req,env,decodeURIComponent(hrJobApps[1]));
  const hrAppStatus=url.pathname.match(/^\/api\/hr\/applications\/([^/]+)\/status$/);if(req.method==='PATCH'&&hrAppStatus)return hrUpdateStatus(req,env,decodeURIComponent(hrAppStatus[1]));
  const reviewClaim=url.pathname.match(/^\/api\/internal\/employer-claims\/([^/]+)$/);if(req.method==='PATCH'&&reviewClaim)return internalReviewClaim(req,env,decodeURIComponent(reviewClaim[1]));
  const mintSession=url.pathname.match(/^\/api\/internal\/hr-identities\/([^/]+)\/session$/);if(req.method==='POST'&&mintSession)return internalMintEmployerSession(req,env,decodeURIComponent(mintSession[1]));
  const internalStatus=url.pathname.match(/^\/api\/internal\/applications\/([^/]+)\/status$/);if(req.method==='PATCH'&&internalStatus)return internalUpdateStatus(req,env,decodeURIComponent(internalStatus[1]));
  if(req.method==='GET'&&url.pathname==='/api/internal/analytics/funnel')return internalFunnel(req,env);
  return json({error:'not_found'},404);
}}
