import {validateEmployerClaim} from './domain.mjs';
import {encryptPII,hashLookup} from './crypto.mjs';

const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
async function readBody(req){try{return await req.json()}catch{return null}}
const out=(data,status=200)=>({data,status});

function authorized(req,env){
  const expected=env.INTERNAL_API_TOKEN;if(!expected)return false;
  return (req.headers.get('authorization')||'')===`Bearer ${expected}`;
}

async function event(env,{type,employerId,payload}){
  try{await env.DB.prepare(`INSERT INTO events(id,actor_type,event_type,employer_id,payload_json,occurred_at) VALUES(?,?,?,?,?,?)`).bind(id('evt'),'system',type,employerId,payload?JSON.stringify(payload):null,now()).run()}catch{}
}

export async function listEmployers(env){
  const rows=await env.DB.prepare(`SELECT e.id,e.slug,e.name,e.operator,e.website,e.claim_status,COUNT(j.id) job_count,SUM(CASE WHEN j.freshness_status='fresh' THEN 1 ELSE 0 END) fresh_job_count FROM employers e LEFT JOIN jobs j ON j.employer_id=e.id AND j.freshness_status!='expired' GROUP BY e.id ORDER BY fresh_job_count DESC,e.name ASC`).all();
  return out({items:rows.results||[]});
}

export async function createEmployerClaim(req,env){
  const raw=await readBody(req);const valid=validateEmployerClaim(raw);if(!valid.ok)return out({error:valid.error},400);
  const employer=await env.DB.prepare(`SELECT id,name,claim_status FROM employers WHERE name=? LIMIT 1`).bind(valid.value.employerName).first();
  if(!employer)return out({error:'employer_not_found'},404);
  const emailHash=await hashLookup(valid.value.email,env.PII_KEY);const emailCipher=await encryptPII(valid.value.email,env.PII_KEY);const ts=now();const claimId=id('clm');
  try{
    await env.DB.prepare(`INSERT INTO employer_claims(id,employer_id,requested_role,email_ciphertext,email_hash,email_domain,verification_method,proof_url,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(claimId,employer.id,valid.value.role,emailCipher,emailHash,valid.value.emailDomain,valid.value.method,valid.value.proofUrl,'pending',ts,ts).run();
  }catch(e){if(String(e).includes('UNIQUE'))return out({error:'claim_already_pending'},409);throw e}
  await event(env,{type:'employer_claim_submitted',employerId:employer.id,payload:{claimId,role:valid.value.role,method:valid.value.method,emailDomain:valid.value.emailDomain}});
  return out({ok:true,claimId,status:'pending',employer:employer.name,verificationMethod:valid.value.method},201);
}

export async function listEmployerClaims(req,env){
  if(!authorized(req,env))return out({error:'unauthorized'},401);
  const rows=await env.DB.prepare(`SELECT c.id,c.employer_id,e.name employer_name,c.requested_role,c.email_domain,c.verification_method,c.proof_url,c.status,c.created_at,c.updated_at FROM employer_claims c JOIN employers e ON e.id=c.employer_id WHERE c.status='pending' ORDER BY c.created_at ASC`).all();
  return out({items:rows.results||[]});
}

export async function reviewEmployerClaim(req,env,claimId){
  if(!authorized(req,env))return out({error:'unauthorized'},401);
  const raw=await readBody(req);const decision=String(raw?.status||'');if(!['approved','rejected'].includes(decision))return out({error:'invalid_status'},400);
  const claim=await env.DB.prepare(`SELECT * FROM employer_claims WHERE id=?`).bind(claimId).first();if(!claim)return out({error:'not_found'},404);if(claim.status!=='pending')return out({error:'claim_closed',status:claim.status},409);
  const ts=now();
  if(decision==='approved'){
    let user=await env.DB.prepare(`SELECT id FROM employer_users WHERE email_hash=? LIMIT 1`).bind(claim.email_hash).first();
    if(user?.id){await env.DB.prepare(`UPDATE employer_users SET employer_id=?,role=?,verification_status='verified',email_ciphertext=?,email_domain=?,updated_at=? WHERE id=?`).bind(claim.employer_id,claim.requested_role,claim.email_ciphertext,claim.email_domain,ts,user.id).run()}
    else{user={id:id('ehr')};await env.DB.prepare(`INSERT INTO employer_users(id,employer_id,email_ciphertext,email_hash,email_domain,role,verification_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(user.id,claim.employer_id,claim.email_ciphertext,claim.email_hash,claim.email_domain,claim.requested_role,'verified',ts,ts).run()}
    await env.DB.prepare(`UPDATE employers SET claim_status='verified',updated_at=? WHERE id=?`).bind(ts,claim.employer_id).run();
  }
  await env.DB.prepare(`UPDATE employer_claims SET status=?,reviewed_at=?,updated_at=? WHERE id=?`).bind(decision,ts,ts,claimId).run();
  await event(env,{type:`employer_claim_${decision}`,employerId:claim.employer_id,payload:{claimId}});
  return out({ok:true,claimId,status:decision});
}
