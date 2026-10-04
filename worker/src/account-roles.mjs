import {encryptPII,hashLookup,hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
const genericMail=new Set(['gmail.com','googlemail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','me.com','proton.me','protonmail.com','live.com']);
const cleanName=v=>String(v||'').trim().replace(/\s+/g,' ').slice(0,120);
const cleanEmail=v=>{const s=String(v||'').trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:''};
const cleanRole=v=>['owner','admin','recruiter','hiring_manager'].includes(String(v||''))?String(v):'recruiter';

function tokenFromCookie(req){const m=(req.headers.get('cookie')||'').match(/(?:^|;\s*)pqc_session=([^;]+)/);return m?decodeURIComponent(m[1]):''}
async function session(req,env){
  const token=tokenFromCookie(req);if(!token)return null;
  const tokenHash=await hashTrackingToken(token);
  return env.DB.prepare(`SELECT a.id,a.account_type,a.email_hash,a.email_ciphertext FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.status='active' LIMIT 1`).bind(tokenHash,now()).first();
}
async function readBody(req){try{return await req.json()}catch{return null}}
async function roleList(env,accountId,fallback){
  const rows=await env.DB.prepare(`SELECT role FROM account_roles WHERE account_id=? ORDER BY role`).bind(accountId).all();
  const roles=(rows.results||[]).map(x=>x.role);return roles.length?roles:[fallback].filter(Boolean);
}
async function employerProfile(env,accountId){
  return env.DB.prepare(`SELECT p.employer_id,p.requested_employer_name,p.requested_role,p.verification_status,p.claim_id,e.name employer_name FROM employer_account_profiles p LEFT JOIN employers e ON e.id=p.employer_id WHERE p.account_id=? LIMIT 1`).bind(accountId).first();
}
async function getRoles(req,env){
  const who=await session(req,env);if(!who)return json({authenticated:false},401);
  const roles=await roleList(env,who.id,who.account_type);const employer=roles.includes('employer')?await employerProfile(env,who.id):null;
  return json({authenticated:true,roles,hasEmail:Boolean(who.email_hash),employer:employer||null});
}
async function addCandidate(req,env){
  const who=await session(req,env);if(!who)return json({error:'login_required'},401);const ts=now();
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO account_roles(account_id,role,created_at) VALUES(?,'candidate',?)`).bind(who.id,ts),
    env.DB.prepare(`INSERT OR IGNORE INTO candidate_account_profiles(account_id,created_at,updated_at) VALUES(?,?,?)`).bind(who.id,ts,ts)
  ]);
  return json({ok:true,role:'candidate'});
}
async function addEmployer(req,env){
  const who=await session(req,env);if(!who)return json({error:'login_required'},401);
  const existing=await employerProfile(env,who.id);if(existing){
    await env.DB.prepare(`INSERT OR IGNORE INTO account_roles(account_id,role,created_at) VALUES(?,'employer',?)`).bind(who.id,now()).run();
    return json({ok:true,role:'employer',employer:existing,idempotent:true});
  }
  const raw=await readBody(req);if(!raw)return json({error:'invalid_body'},400);
  const employerName=cleanName(raw.employerName);if(employerName.length<2)return json({error:'employer_name_required'},400);
  const requestedRole=cleanRole(raw.role);let emailHash=who.email_hash,emailCipher=who.email_ciphertext;const ts=now();const statements=[];
  if(!emailHash){
    const email=cleanEmail(raw.email);if(!email)return json({error:'work_email_required'},400);
    emailHash=await hashLookup(email,env.PII_KEY);
    const conflict=await env.DB.prepare(`SELECT id FROM accounts WHERE email_hash=? AND id<>? LIMIT 1`).bind(emailHash,who.id).first();if(conflict)return json({error:'account_exists'},409);
    emailCipher=await encryptPII(email,env.PII_KEY);
    statements.push(env.DB.prepare(`UPDATE accounts SET email_ciphertext=?,email_hash=?,updated_at=? WHERE id=?`).bind(emailCipher,emailHash,ts,who.id));
  }
  const employer=await env.DB.prepare(`SELECT id,name,claim_status FROM employers WHERE lower(name)=lower(?) LIMIT 1`).bind(employerName).first();
  const employerId=employer?.id||null;let verification='pending',claimId=null;
  if(employerId){
    const approved=await env.DB.prepare(`SELECT id FROM employer_claims WHERE employer_id=? AND email_hash=? AND status='approved' ORDER BY reviewed_at DESC LIMIT 1`).bind(employerId,emailHash).first();
    if(approved?.id){claimId=approved.id;verification='verified'}
    else {
      const pending=await env.DB.prepare(`SELECT id FROM employer_claims WHERE employer_id=? AND email_hash=? AND status='pending' LIMIT 1`).bind(employerId,emailHash).first();
      claimId=pending?.id||id('clm');
      if(!pending){
        const email=cleanEmail(raw.email);const domain=email?email.split('@')[1]||'':'';const method=genericMail.has(domain)?'manual':'work_email';
        statements.push(env.DB.prepare(`INSERT INTO employer_claims(id,employer_id,requested_role,email_ciphertext,email_hash,email_domain,verification_method,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(claimId,employerId,requestedRole,emailCipher,emailHash,domain,method,'pending',ts,ts));
        statements.push(env.DB.prepare(`UPDATE employers SET claim_status='pending',updated_at=? WHERE id=? AND claim_status='unclaimed'`).bind(ts,employerId));
      }
    }
  }
  statements.push(env.DB.prepare(`INSERT OR IGNORE INTO account_roles(account_id,role,created_at) VALUES(?,'employer',?)`).bind(who.id,ts));
  statements.push(env.DB.prepare(`INSERT INTO employer_account_profiles(account_id,employer_id,requested_employer_name,requested_role,verification_status,claim_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`).bind(who.id,employerId,employerName,requestedRole,verification,claimId,ts,ts));
  await env.DB.batch(statements);
  return json({ok:true,role:'employer',employer:{employer_id:employerId,requested_employer_name:employerName,requested_role:requestedRole,verification_status:verification,claim_id:claimId}},201);
}

export async function accountRoleRoute(req,env,url){
  if(url.pathname==='/api/account-roles'&&req.method==='GET')return getRoles(req,env);
  if(url.pathname==='/api/account-roles/candidate'&&req.method==='POST')return addCandidate(req,env);
  if(url.pathname==='/api/account-roles/employer'&&req.method==='POST')return addEmployer(req,env);
  return null;
}
