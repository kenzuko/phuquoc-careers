import {hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;
async function body(req){try{return await req.json()}catch{return null}}
const text=(value,max)=>String(value??'').trim().slice(0,max)||null;
export function safeHttpUrl(value){
  if(!value)return null;
  try{const u=new URL(String(value));return ['http:','https:'].includes(u.protocol)?u.toString():null}catch{return null}
}

async function hrSession(req,env){
  const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))return null;const token=auth.slice(7).trim();if(!token)return null;
  const hash=await hashTrackingToken(token);
  return env.DB.prepare(`SELECT s.hr_identity_id FROM employer_sessions s JOIN hr_identities i ON i.id=s.hr_identity_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND i.verification_status='verified' LIMIT 1`).bind(hash,now()).first();
}
async function membership(env,hrIdentityId,employerId){return env.DB.prepare(`SELECT role FROM employer_memberships WHERE hr_identity_id=? AND employer_id=? AND status='active' LIMIT 1`).bind(hrIdentityId,employerId).first()}

export async function jobDrafts(req,env){
  const session=await hrSession(req,env);if(!session)return json({error:'unauthorized'},401);
  if(req.method==='GET'){
    const rows=await env.DB.prepare(`SELECT d.*,e.name employer_name,m.role membership_role FROM job_drafts d JOIN employers e ON e.id=d.employer_id JOIN employer_memberships m ON m.employer_id=d.employer_id AND m.hr_identity_id=? AND m.status='active' WHERE d.hr_identity_id=? ORDER BY d.updated_at DESC LIMIT 100`).bind(session.hr_identity_id,session.hr_identity_id).all();
    return json({items:rows.results||[]});
  }
  const raw=await body(req);const employerId=text(raw?.employerId,100);const inputType=String(raw?.inputType||'');const parsed=raw?.parsed||{};
  if(!employerId)return json({error:'employer_required'},400);
  if(!['text','url','poster'].includes(inputType))return json({error:'input_type_invalid'},400);
  const title=text(parsed.title,160);if(!title)return json({error:'title_required'},400);
  const member=await membership(env,session.hr_identity_id,employerId);if(!member||member.role==='viewer')return json({error:'forbidden'},403);

  const sourceUrl=raw?.sourceUrl?safeHttpUrl(raw.sourceUrl):null;
  if(raw?.sourceUrl&&!sourceUrl)return json({error:'source_url_invalid'},400);
  if(inputType==='url'&&!sourceUrl)return json({error:'source_url_required'},400);

  const draftId=id('drf');const ts=now();
  const house=parsed.staffHouseState==='mentioned'?'mentioned':'unknown';
  const service=parsed.serviceChargeState==='mentioned'?'mentioned':'unknown';
  const parserStatus=inputType==='text'?'parsed':'needs_parser';
  await env.DB.prepare(`INSERT INTO job_drafts(id,hr_identity_id,employer_id,input_type,source_url,upload_name,raw_text,title,department,experience,salary_text,staff_house_state,service_charge_state,off_days_text,parser_status,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    draftId,session.hr_identity_id,employerId,inputType,sourceUrl,text(raw?.uploadName,255),text(raw?.rawText,50000),title,text(parsed.department,120),text(parsed.experience,240),text(parsed.salary,120),house,service,text(parsed.offDays,120),parserStatus,'draft',ts,ts
  ).run();
  try{await env.DB.prepare(`INSERT INTO events(id,actor_type,actor_id,event_type,employer_id,source_channel,payload_json,occurred_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id('evt'),'hr_identity',session.hr_identity_id,'job_draft_created',employerId,'direct',JSON.stringify({draftId,inputType,parserStatus}),ts).run()}catch{}
  return json({ok:true,draftId,status:'draft',parserStatus},201);
}
