import {validateIntent,validateApplication,intentExpiry} from './domain.mjs';
import {encryptPII,hashLookup} from './crypto.mjs';

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

async function ensureGuest(env,{name,phone}){
  const ts=now();const guestId=id('gst');
  if(!phone){await env.DB.prepare(`INSERT INTO guest_profiles(id,created_at,updated_at) VALUES(?,?,?)`).bind(guestId,ts,ts).run();return guestId}
  const lookup=await hashLookup(phone,env.PII_KEY);const existing=await env.DB.prepare(`SELECT id FROM guest_profiles WHERE phone_hash=? LIMIT 1`).bind(lookup).first();if(existing?.id) return existing.id;
  const nameCipher=name?await encryptPII(name,env.PII_KEY):null;const phoneCipher=await encryptPII(phone,env.PII_KEY);
  await env.DB.prepare(`INSERT INTO guest_profiles(id,name_ciphertext,phone_ciphertext,phone_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)`).bind(guestId,nameCipher,phoneCipher,lookup,ts,ts).run();return guestId;
}

async function saveIntent(req,env){const raw=await body(req);const valid=validateIntent(raw);if(!valid.ok)return json({error:valid.error},400);const guestId=raw.guestId||await ensureGuest(env,{});const ts=now();const intentId=id('int');await env.DB.prepare(`INSERT INTO candidate_intents(id,guest_id,job_id,intent,confirmed_at,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`).bind(intentId,guestId,valid.value.jobId,valid.value.intent,ts,intentExpiry(new Date(ts)),ts,ts).run();return json({ok:true,guestId,intentId,expiresAt:intentExpiry(new Date(ts))},201)}

async function apply(req,env){const raw=await body(req);const valid=validateApplication(raw);if(!valid.ok)return json({error:valid.error},400);const job=await env.DB.prepare(`SELECT id FROM jobs WHERE id=? AND freshness_status!='expired'`).bind(valid.value.jobId).first();if(!job)return json({error:'job_not_available'},409);const guestId=raw.guestId||await ensureGuest(env,{name:valid.value.name,phone:valid.value.phone});const ts=now();const applicationId=id('app');try{await env.DB.prepare(`INSERT INTO applications(id,guest_id,job_id,status,interview_preference,available_date,consent_scope,submitted_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(applicationId,guestId,valid.value.jobId,'submitted',valid.value.interviewPreference,valid.value.availableDate,'this_employer_only',ts,ts).run()}catch(e){if(String(e).includes('UNIQUE'))return json({error:'already_applied',guestId},409);throw e}return json({ok:true,applicationId,guestId,status:'submitted'},201)}

export default {async fetch(req,env){
  const url=new URL(req.url);if(url.pathname==='/api/health')return json({ok:true,service:'phuquoc-careers-api'});
  if(req.method==='GET'&&url.pathname==='/api/jobs')return listJobs(env,url);
  const m=url.pathname.match(/^\/api\/jobs\/([^/]+)$/);if(req.method==='GET'&&m)return getJob(env,decodeURIComponent(m[1]));
  if(req.method==='POST'&&url.pathname==='/api/intent')return saveIntent(req,env);
  if(req.method==='POST'&&url.pathname==='/api/applications')return apply(req,env);
  return json({error:'not_found'},404);
}}
