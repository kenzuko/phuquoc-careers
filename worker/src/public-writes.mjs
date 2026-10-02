import {validateIntent,validateApplication,validateEmployerClaim,intentExpiry} from './domain.mjs';
import {encryptPII,hashLookup,createTrackingToken,hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const rateLimited=()=>new Response(JSON.stringify({error:'rate_limited'}),{status:429,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','retry-after':'60'}});
const unavailable=feature=>json({error:'feature_not_enabled',feature},503);
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
async function body(req){try{return await req.json()}catch{return null}}
async function withinLimit(binding,key){if(!binding)return true;try{return Boolean((await binding.limit({key})).success)}catch{return true}}

async function recordEvent(env,{actorType='system',actorId=null,eventType,jobId=null,employerId=null,sourceChannel='direct',payload=null}){
  try{await env.DB.prepare(`INSERT INTO events(id,actor_type,actor_id,event_type,job_id,employer_id,source_channel,payload_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id('evt'),actorType,actorId,eventType,jobId,employerId,sourceChannel,payload?JSON.stringify(payload):null,now()).run()}catch{}
}

async function refreshGuestName(env,guestId,name,ts){
  if(!name)return;
  const cipher=await encryptPII(name,env.PII_KEY);
  await env.DB.prepare(`UPDATE guest_profiles SET name_ciphertext=?,updated_at=? WHERE id=?`).bind(cipher,ts,guestId).run();
}

async function mergeAnonymousGuest(env,fromId,toId){
  if(!fromId||!toId||fromId===toId)return;
  const apps=await env.DB.prepare(`SELECT COUNT(*) count FROM applications WHERE guest_id=?`).bind(fromId).first();
  if(Number(apps?.count||0)>0)return;
  await env.DB.prepare(`UPDATE candidate_intents SET guest_id=?,updated_at=? WHERE guest_id=?`).bind(toId,now(),fromId).run();
  await env.DB.prepare(`DELETE FROM guest_profiles WHERE id=? AND phone_hash IS NULL`).bind(fromId).run();
}

async function ensureGuestForApplication(env,{name,phone,lookup,requestedGuestId=null}){
  const ts=now();const nameCipher=await encryptPII(name,env.PII_KEY);const phoneCipher=await encryptPII(phone,env.PII_KEY);
  let requested=null;
  if(requestedGuestId){requested=await env.DB.prepare(`SELECT id,phone_hash FROM guest_profiles WHERE id=? LIMIT 1`).bind(String(requestedGuestId).slice(0,120)).first()}

  if(requested?.phone_hash===lookup){await refreshGuestName(env,requested.id,name,ts);return requested.id}

  const existing=await env.DB.prepare(`SELECT id FROM guest_profiles WHERE phone_hash=? LIMIT 1`).bind(lookup).first();
  if(existing?.id){
    if(requested?.id&&requested.phone_hash===null)await mergeAnonymousGuest(env,requested.id,existing.id);
    await refreshGuestName(env,existing.id,name,ts);return existing.id;
  }

  if(requested?.id&&requested.phone_hash===null){
    try{
      const result=await env.DB.prepare(`UPDATE guest_profiles SET name_ciphertext=?,phone_ciphertext=?,phone_hash=?,updated_at=? WHERE id=? AND phone_hash IS NULL`).bind(nameCipher,phoneCipher,lookup,ts,requested.id).run();
      if(Number(result?.meta?.changes||0)>0)return requested.id;
    }catch(e){
      if(!String(e).toLowerCase().includes('unique'))throw e;
      const raced=await env.DB.prepare(`SELECT id FROM guest_profiles WHERE phone_hash=? LIMIT 1`).bind(lookup).first();
      if(raced?.id){await mergeAnonymousGuest(env,requested.id,raced.id);await refreshGuestName(env,raced.id,name,ts);return raced.id}
      throw e;
    }
  }

  const guestId=id('gst');
  try{
    await env.DB.prepare(`INSERT INTO guest_profiles(id,name_ciphertext,phone_ciphertext,phone_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)`).bind(guestId,nameCipher,phoneCipher,lookup,ts,ts).run();
    return guestId;
  }catch(e){
    if(!String(e).toLowerCase().includes('unique'))throw e;
    const raced=await env.DB.prepare(`SELECT id FROM guest_profiles WHERE phone_hash=? LIMIT 1`).bind(lookup).first();
    if(!raced?.id)throw e;
    if(requested?.id&&requested.phone_hash===null)await mergeAnonymousGuest(env,requested.id,raced.id);
    await refreshGuestName(env,raced.id,name,ts);return raced.id;
  }
}

async function guestForIntent(env,requestedGuestId){
  if(requestedGuestId){const row=await env.DB.prepare(`SELECT id FROM guest_profiles WHERE id=? LIMIT 1`).bind(String(requestedGuestId).slice(0,120)).first();if(row?.id)return row.id}
  const guestId=id('gst');const ts=now();await env.DB.prepare(`INSERT INTO guest_profiles(id,created_at,updated_at) VALUES(?,?,?)`).bind(guestId,ts,ts).run();return guestId;
}

async function saveIntent(req,env){
  if(env.CANDIDATE_WRITES_ENABLED!=='true')return unavailable('candidate_writes');
  const raw=await body(req);const valid=validateIntent(raw);if(!valid.ok)return json({error:valid.error},400);
  if(valid.value.jobId){const job=await env.DB.prepare(`SELECT id FROM jobs WHERE id=? AND freshness_status!='expired'`).bind(valid.value.jobId).first();if(!job)return json({error:'job_not_available'},409)}
  const guestId=await guestForIntent(env,raw?.guestId);const ts=now();const intentId=id('int');const expiresAt=intentExpiry(new Date(ts));
  await env.DB.prepare(`INSERT INTO candidate_intents(id,guest_id,job_id,intent,confirmed_at,expires_at,source_channel,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(intentId,guestId,valid.value.jobId,valid.value.intent,ts,expiresAt,valid.value.sourceChannel,ts,ts).run();
  await recordEvent(env,{actorType:'guest',actorId:guestId,eventType:'intent_confirmed',jobId:valid.value.jobId,sourceChannel:valid.value.sourceChannel,payload:{intent:valid.value.intent,intentId}});
  return json({ok:true,guestId,intentId,expiresAt},201);
}

async function apply(req,env){
  if(env.CANDIDATE_WRITES_ENABLED!=='true')return unavailable('candidate_writes');
  const raw=await body(req);const valid=validateApplication(raw);if(!valid.ok)return json({error:valid.error},400);
  const phoneLookup=await hashLookup(valid.value.phone,env.PII_KEY);
  if(!(await withinLimit(env.APPLICATION_RATE_LIMITER,`apply:${phoneLookup}`)))return rateLimited();
  const job=await env.DB.prepare(`SELECT id FROM jobs WHERE id=? AND freshness_status!='expired'`).bind(valid.value.jobId).first();if(!job)return json({error:'job_not_available'},409);
  const guestId=await ensureGuestForApplication(env,{name:valid.value.name,phone:valid.value.phone,lookup:phoneLookup,requestedGuestId:raw?.guestId||null});
  const ts=now();const applicationId=id('app');const trackingToken=createTrackingToken();const trackingHash=await hashTrackingToken(trackingToken);
  try{
    await env.DB.prepare(`INSERT INTO applications(id,guest_id,job_id,status,interview_preference,available_date,consent_scope,tracking_token_hash,status_changed_at,source_channel,submitted_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(applicationId,guestId,valid.value.jobId,'submitted',valid.value.interviewPreference,valid.value.availableDate,'this_employer_only',trackingHash,ts,valid.value.sourceChannel,ts,ts).run();
  }catch(e){if(String(e).toLowerCase().includes('unique'))return json({error:'already_applied',guestId},409);throw e}
  await recordEvent(env,{actorType:'guest',actorId:guestId,eventType:'application_submitted',jobId:valid.value.jobId,sourceChannel:valid.value.sourceChannel,payload:{applicationId,status:'submitted'}});
  return json({ok:true,applicationId,guestId,status:'submitted',trackingToken},201);
}

async function submitEmployerClaim(req,env){
  if(env.EMPLOYER_CLAIMS_ENABLED!=='true')return unavailable('employer_claims');
  const raw=await body(req);const valid=validateEmployerClaim(raw);if(!valid.ok)return json({error:valid.error},400);
  const emailHash=await hashLookup(valid.value.email,env.PII_KEY);
  if(!(await withinLimit(env.CLAIM_RATE_LIMITER,`claim:${emailHash}`)))return rateLimited();
  const employer=await env.DB.prepare(`SELECT id,name,claim_status FROM employers WHERE lower(name)=lower(?) LIMIT 1`).bind(valid.value.employerName).first();
  if(!employer)return json({error:'employer_not_found'},404);
  const ts=now();const claimId=id('clm');const emailCipher=await encryptPII(valid.value.email,env.PII_KEY);
  const existing=await env.DB.prepare(`SELECT id,status FROM employer_claims WHERE employer_id=? AND email_hash=? AND status='pending' LIMIT 1`).bind(employer.id,emailHash).first();
  if(existing)return json({ok:true,claimId:existing.id,status:'pending',duplicate:true},200);
  try{
    await env.DB.prepare(`INSERT INTO employer_claims(id,employer_id,requested_role,email_ciphertext,email_hash,email_domain,verification_method,proof_url,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(claimId,employer.id,valid.value.role,emailCipher,emailHash,valid.value.emailDomain,valid.value.method,valid.value.proofUrl,'pending',ts,ts).run();
  }catch(e){
    if(!String(e).toLowerCase().includes('unique'))throw e;
    const raced=await env.DB.prepare(`SELECT id FROM employer_claims WHERE employer_id=? AND email_hash=? AND status='pending' LIMIT 1`).bind(employer.id,emailHash).first();
    if(raced?.id)return json({ok:true,claimId:raced.id,status:'pending',duplicate:true},200);
    throw e;
  }
  if(employer.claim_status!=='verified')await env.DB.prepare(`UPDATE employers SET claim_status='pending',updated_at=? WHERE id=?`).bind(ts,employer.id).run();
  await recordEvent(env,{eventType:'employer_claim_submitted',employerId:employer.id,payload:{claimId,verificationMethod:valid.value.method,requestedRole:valid.value.role}});
  return json({ok:true,claimId,status:'pending',verificationMethod:valid.value.method,employer:employer.name},201);
}

export async function publicWriteRoute(req,env,url){
  if(req.method!=='POST')return null;
  if(url.pathname==='/api/intent')return saveIntent(req,env);
  if(url.pathname==='/api/applications')return apply(req,env);
  if(url.pathname==='/api/employer-claims')return submitEmployerClaim(req,env);
  return null;
}
