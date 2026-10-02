import {createTrackingToken,hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
async function body(req){try{return await req.json()}catch{return null}}
function internalAuthorized(req,env){const expected=env.INTERNAL_API_TOKEN;if(!expected)return false;return (req.headers.get('authorization')||'')===`Bearer ${expected}`}

export async function createHrLoginLink(req,env,hrIdentityId){
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);
  const identity=await env.DB.prepare(`SELECT id,verification_status FROM hr_identities WHERE id=?`).bind(hrIdentityId).first();
  if(!identity)return json({error:'not_found'},404);
  if(identity.verification_status!=='verified')return json({error:'identity_not_verified'},409);
  const raw=await body(req);const minutes=Math.min(Math.max(Number(raw?.minutes||30),5),1440);const ts=now();const expiresAt=new Date(Date.now()+minutes*60000).toISOString();
  const token=createTrackingToken();const tokenHash=await hashTrackingToken(token);const linkId=id('hrl');
  await env.DB.prepare(`UPDATE hr_login_links SET revoked_at=? WHERE hr_identity_id=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>?`).bind(ts,hrIdentityId,ts).run();
  await env.DB.prepare(`INSERT INTO hr_login_links(id,hr_identity_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)`).bind(linkId,hrIdentityId,tokenHash,expiresAt,ts).run();
  return json({ok:true,linkId,token,expiresAt,loginFragmentPath:`/employer/login.html#token=${encodeURIComponent(token)}`},201);
}

export async function redeemHrLogin(req,env){
  const raw=await body(req);const token=String(raw?.token||'').trim();if(!token)return json({error:'token_required'},400);
  const tokenHash=await hashTrackingToken(token);const ts=now();
  const link=await env.DB.prepare(`SELECT l.id,l.hr_identity_id,l.expires_at,i.verification_status FROM hr_login_links l JOIN hr_identities i ON i.id=l.hr_identity_id WHERE l.token_hash=? AND l.used_at IS NULL AND l.revoked_at IS NULL AND l.expires_at>? LIMIT 1`).bind(tokenHash,ts).first();
  if(!link||link.verification_status!=='verified')return json({error:'invalid_or_expired_link'},401);
  const hours=Math.min(Math.max(Number(env.HR_SESSION_HOURS||12),1),168);const expiresAt=new Date(Date.now()+hours*3600000).toISOString();
  const sessionToken=createTrackingToken();const sessionHash=await hashTrackingToken(sessionToken);const sessionId=id('hrs');
  try{
    await env.DB.prepare(`INSERT INTO employer_sessions(id,hr_identity_id,token_hash,expires_at,created_at,login_link_id) VALUES(?,?,?,?,?,?)`).bind(sessionId,link.hr_identity_id,sessionHash,expiresAt,ts,link.id).run();
  }catch(e){if(String(e).toLowerCase().includes('unique'))return json({error:'link_already_used'},409);throw e}
  await env.DB.prepare(`UPDATE hr_login_links SET used_at=? WHERE id=? AND used_at IS NULL`).bind(ts,link.id).run();
  return json({ok:true,sessionToken,sessionId,expiresAt,hrIdentityId:link.hr_identity_id},201);
}
