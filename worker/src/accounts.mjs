import {encryptPII,decryptPII,hashLookup,createTrackingToken,hashTrackingToken} from './crypto.mjs';

const te=new TextEncoder();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const unb64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const sessionDays=env=>Math.max(1,Math.min(90,Number(env.ACCOUNT_SESSION_DAYS||30)||30));

async function body(req){try{return await req.json()}catch{return null}}
function cleanName(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,80)}
function cleanEmail(v){const s=String(v||'').trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:''}
function cleanPhone(v){const raw=String(v||'').trim();const plus=raw.startsWith('+');const digits=raw.replace(/\D/g,'');if(digits.length<8||digits.length>15)return '';return plus?`+${digits}`:digits}
function cleanRole(v){const s=String(v||'recruiter');return ['owner','admin','recruiter','hiring_manager'].includes(s)?s:'recruiter'}
function validPassword(v){const s=String(v||'');return s.length>=8&&s.length<=72}
function accountCookie(token,maxAge){return `pqc_session=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`}
function clearCookie(){return 'pqc_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'}
function tokenFromCookie(req){const raw=req.headers.get('cookie')||'';const m=raw.match(/(?:^|;\s*)pqc_session=([^;]+)/);return m?decodeURIComponent(m[1]):''}
async function withinLimit(env,key){if(!env.CLAIM_RATE_LIMITER)return true;try{return Boolean((await env.CLAIM_RATE_LIMITER.limit({key})).success)}catch{return true}}

async function passwordHash(password,saltBytes){
  const material=await crypto.subtle.importKey('raw',te.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:saltBytes,iterations:180000},material,256);
  return b64(new Uint8Array(bits));
}
async function makePassword(password){const salt=crypto.getRandomValues(new Uint8Array(16));return {salt:b64(salt),hash:await passwordHash(password,salt)}}
async function verifyPassword(password,salt,expected){
  const actual=await passwordHash(password,unb64(salt));
  if(actual.length!==expected.length)return false;
  let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}

async function makeSession(env,accountId){
  const token=createTrackingToken();const tokenHash=await hashTrackingToken(token);const created=now();const expires=new Date(Date.now()+sessionDays(env)*86400000).toISOString();
  await env.DB.prepare(`INSERT INTO account_sessions(id,account_id,token_hash,expires_at,created_at,last_used_at) VALUES(?,?,?,?,?,?)`).bind(id('ses'),accountId,tokenHash,expires,created,created).run();
  return {token,expires,maxAge:sessionDays(env)*86400};
}

async function record(env,{actorType,actorId,eventType,employerId=null,payload=null}){
  try{await env.DB.prepare(`INSERT INTO events(id,actor_type,actor_id,event_type,employer_id,source_channel,payload_json,occurred_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id('evt'),actorType,actorId,eventType,employerId,'account',payload?JSON.stringify(payload):null,now()).run()}catch{}
}

async function findConflict(env,emailHash,phoneHash){
  if(emailHash){const row=await env.DB.prepare(`SELECT id FROM accounts WHERE email_hash=? LIMIT 1`).bind(emailHash).first();if(row)return true}
  if(phoneHash){const row=await env.DB.prepare(`SELECT id FROM accounts WHERE phone_hash=? LIMIT 1`).bind(phoneHash).first();if(row)return true}
  return false;
}

async function register(req,env){
  const raw=await body(req);if(!raw)return json({error:'invalid_body'},400);
  const type=raw.type==='employer'?'employer':'candidate';const name=cleanName(raw.name);const email=cleanEmail(raw.email);const phone=cleanPhone(raw.phone);const password=String(raw.password||'');
  if(name.length<2)return json({error:'name_required'},400);
  if(!validPassword(password))return json({error:'password_too_short'},400);
  if(type==='employer'&&!email)return json({error:'work_email_required'},400);
  if(type==='candidate'&&!email&&!phone)return json({error:'email_or_phone_required'},400);
  const emailHash=email?await hashLookup(email,env.PII_KEY):null;const phoneHash=phone?await hashLookup(phone,env.PII_KEY):null;
  const limiterKey=emailHash||phoneHash;if(limiterKey&&!(await withinLimit(env,`account-register:${limiterKey}`)))return json({error:'rate_limited'},429,{'retry-after':'60'});
  if(await findConflict(env,emailHash,phoneHash))return json({error:'account_exists'},409);

  const accountId=id('acct'),ts=now(),pass=await makePassword(password),nameCipher=await encryptPII(name,env.PII_KEY),emailCipher=email?await encryptPII(email,env.PII_KEY):null,phoneCipher=phone?await encryptPII(phone,env.PII_KEY):null;
  const statements=[env.DB.prepare(`INSERT INTO accounts(id,account_type,display_name_ciphertext,email_ciphertext,email_hash,phone_ciphertext,phone_hash,password_salt,password_hash,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(accountId,type,nameCipher,emailCipher,emailHash,phoneCipher,phoneHash,pass.salt,pass.hash,'active',ts,ts)];
  let employerId=null,claimId=null,verification='';
  if(type==='candidate'){
    statements.push(env.DB.prepare(`INSERT INTO candidate_account_profiles(account_id,created_at,updated_at) VALUES(?,?,?)`).bind(accountId,ts,ts));
  }else{
    const requestedEmployerName=cleanName(raw.employerName);if(requestedEmployerName.length<2)return json({error:'employer_name_required'},400);
    const role=cleanRole(raw.role);const employer=await env.DB.prepare(`SELECT id,name,claim_status FROM employers WHERE lower(name)=lower(?) LIMIT 1`).bind(requestedEmployerName).first();
    employerId=employer?.id||null;verification=employer?.claim_status==='verified'?'verified':'pending';
    if(employerId&&verification!=='verified'){
      const existing=emailHash?await env.DB.prepare(`SELECT id FROM employer_claims WHERE employer_id=? AND email_hash=? AND status='pending' LIMIT 1`).bind(employerId,emailHash).first():null;
      claimId=existing?.id||id('clm');
      if(!existing){const domain=email.split('@')[1]||'';statements.push(env.DB.prepare(`INSERT INTO employer_claims(id,employer_id,requested_role,email_ciphertext,email_hash,email_domain,verification_method,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(claimId,employerId,role,emailCipher,emailHash,domain,'work_email','pending',ts,ts));statements.push(env.DB.prepare(`UPDATE employers SET claim_status='pending',updated_at=? WHERE id=? AND claim_status!='verified'`).bind(ts,employerId))}
    }
    statements.push(env.DB.prepare(`INSERT INTO employer_account_profiles(account_id,employer_id,requested_employer_name,requested_role,verification_status,claim_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`).bind(accountId,employerId,requestedEmployerName,role,verification||'pending',claimId,ts,ts));
  }
  try{await env.DB.batch(statements)}catch(e){if(String(e).toLowerCase().includes('unique'))return json({error:'account_exists'},409);throw e}
  const session=await makeSession(env,accountId);await record(env,{actorType:type==='candidate'?'candidate':'hr_identity',actorId:accountId,eventType:'account_registered',employerId,payload:{accountType:type,verification:verification||null}});
  return json({ok:true,account:{id:accountId,type,name,verification:verification||null,employerId}},201,{'set-cookie':accountCookie(session.token,session.maxAge)});
}

async function login(req,env){
  const raw=await body(req);const identifier=String(raw?.identifier||'').trim();const password=String(raw?.password||'');if(!identifier||!password)return json({error:'identifier_and_password_required'},400);
  const email=identifier.includes('@')?cleanEmail(identifier):'';const phone=email?'':cleanPhone(identifier);if(!email&&!phone)return json({error:'invalid_login'},401);
  const lookup=await hashLookup(email||phone,env.PII_KEY);if(!(await withinLimit(env,`account-login:${lookup}`)))return json({error:'rate_limited'},429,{'retry-after':'60'});
  const row=email?await env.DB.prepare(`SELECT * FROM accounts WHERE email_hash=? LIMIT 1`).bind(lookup).first():await env.DB.prepare(`SELECT * FROM accounts WHERE phone_hash=? LIMIT 1`).bind(lookup).first();
  if(!row||row.status!=='active'||!(await verifyPassword(password,row.password_salt,row.password_hash)))return json({error:'invalid_login'},401);
  const session=await makeSession(env,row.id);await record(env,{actorType:row.account_type==='candidate'?'candidate':'hr_identity',actorId:row.id,eventType:'account_login'});
  return json({ok:true,type:row.account_type},200,{'set-cookie':accountCookie(session.token,session.maxAge)});
}

async function sessionAccount(req,env){
  const token=tokenFromCookie(req);if(!token)return null;const tokenHash=await hashTrackingToken(token);const ts=now();
  const row=await env.DB.prepare(`SELECT a.*,s.id session_id FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.status='active' LIMIT 1`).bind(tokenHash,ts).first();
  if(!row)return null;await env.DB.prepare(`UPDATE account_sessions SET last_used_at=? WHERE id=?`).bind(ts,row.session_id).run();return row;
}

async function me(req,env){
  const row=await sessionAccount(req,env);if(!row)return json({authenticated:false},401);
  let name='',email='',phone='';try{name=await decryptPII(row.display_name_ciphertext,env.PII_KEY);if(row.email_ciphertext)email=await decryptPII(row.email_ciphertext,env.PII_KEY);if(row.phone_ciphertext)phone=await decryptPII(row.phone_ciphertext,env.PII_KEY)}catch{}
  const account={id:row.id,type:row.account_type,name,email,phone};
  if(row.account_type==='employer'){
    const p=await env.DB.prepare(`SELECT p.employer_id,p.requested_employer_name,p.requested_role,p.verification_status,p.claim_id,e.name employer_name,e.website FROM employer_account_profiles p LEFT JOIN employers e ON e.id=p.employer_id WHERE p.account_id=? LIMIT 1`).bind(row.id).first();account.employer=p||null;
  }
  return json({authenticated:true,account});
}

async function logout(req,env){
  const token=tokenFromCookie(req);if(token){const tokenHash=await hashTrackingToken(token);await env.DB.prepare(`UPDATE account_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL`).bind(now(),tokenHash).run()}
  return json({ok:true},200,{'set-cookie':clearCookie()});
}

export async function accountRoute(req,env,url){
  if(url.pathname==='/api/accounts/me'&&req.method==='GET')return me(req,env);
  if(url.pathname==='/api/accounts/register'&&req.method==='POST')return register(req,env);
  if(url.pathname==='/api/accounts/login'&&req.method==='POST')return login(req,env);
  if(url.pathname==='/api/accounts/logout'&&req.method==='POST')return logout(req,env);
  return null;
}
