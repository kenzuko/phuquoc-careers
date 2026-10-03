import {encryptPII,hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=()=>`qjob_${crypto.randomUUID()}`;
const text=(v,max=240)=>String(v||'').trim().replace(/\s+/g,' ').slice(0,max);
const allowedContact=new Set(['phone','zalo','email','other']);

function sessionToken(req){const m=(req.headers.get('cookie')||'').match(/(?:^|;\s*)pqc_session=([^;]+)/);return m?decodeURIComponent(m[1]):''}
async function account(req,env){
  const token=sessionToken(req);if(!token)return null;
  const tokenHash=await hashTrackingToken(token);
  return env.DB.prepare(`SELECT a.id,a.account_type,p.employer_id,p.verification_status FROM account_sessions s JOIN accounts a ON a.id=s.account_id LEFT JOIN employer_account_profiles p ON p.account_id=a.id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.status='active' LIMIT 1`).bind(tokenHash,now()).first();
}
async function readBody(req){try{return await req.json()}catch{return null}}

async function list(env,url){
  const zone=text(url.searchParams.get('zone'),80),industry=text(url.searchParams.get('industry'),80);
  const where=[`moderation_status='approved'`,`expires_at>?`],bind=[now()];
  if(zone){where.push('zone=?');bind.push(zone)}if(industry){where.push('industry=?');bind.push(industry)}
  const rows=await env.DB.prepare(`SELECT id,title,occupation_family,industry,employer_name,workplace_name,zone,address_text,salary_text,shift_text,description,trust_state,expires_at,created_at FROM quick_job_posts WHERE ${where.join(' AND ')} ORDER BY approved_at DESC,created_at DESC LIMIT 100`).bind(...bind).all();
  return json({ok:true,items:rows.results||[]});
}

async function submit(req,env){
  const who=await account(req,env);if(!who)return json({error:'login_required'},401);
  const raw=await readBody(req);if(!raw)return json({error:'invalid_body'},400);
  const title=text(raw.title,120),employerName=text(raw.employerName,120),zone=text(raw.zone,80),contact=text(raw.contact,160);
  if(title.length<3)return json({error:'title_required'},400);
  if(employerName.length<2)return json({error:'employer_name_required'},400);
  if(!zone)return json({error:'zone_required'},400);
  if(contact.length<3)return json({error:'contact_required'},400);
  const contactType=allowedContact.has(raw.contactType)?raw.contactType:'other';
  const contactCiphertext=await encryptPII(contact,env.PII_KEY);
  const ts=now(),expires=new Date(Date.now()+14*86400000).toISOString();
  const trust=who.verification_status==='verified'&&who.employer_id?'employer_verified':'community_unverified';
  const postId=id();
  await env.DB.prepare(`INSERT INTO quick_job_posts(id,account_id,employer_id,title,occupation_family,industry,employer_name,workplace_name,zone,address_text,salary_text,shift_text,description,contact_ciphertext,contact_type,moderation_status,trust_state,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(postId,who.id,who.employer_id||null,title,text(raw.occupationFamily,80)||null,text(raw.industry,80)||null,employerName,text(raw.workplaceName,120)||null,zone,text(raw.address,220)||null,text(raw.salary,100)||null,text(raw.shift,120)||null,text(raw.description,1200)||null,contactCiphertext,contactType,'pending',trust,expires,ts,ts).run();
  return json({ok:true,id:postId,status:'pending',trustState:trust,expiresAt:expires,message:'Tin đã được nhận và đang chờ kiểm tra trước khi hiển thị.'},201);
}

export async function quickJobRoute(req,env,url){
  if(url.pathname==='/api/quick-jobs'&&req.method==='GET')return list(env,url);
  if(url.pathname==='/api/quick-jobs'&&req.method==='POST')return submit(req,env);
  return null;
}
