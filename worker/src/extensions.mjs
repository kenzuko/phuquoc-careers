import {hashTrackingToken} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const id=prefix=>`${prefix}_${crypto.randomUUID()}`;

function publicJob(row){
  const tags=[];
  if(row.staff_house_state==='mentioned')tags.push('Accommodation mentioned');
  if(row.service_charge_state==='mentioned')tags.push('Service charge mentioned');
  const verified=Boolean(row.employer_confirmed_at);
  return {
    id:row.id,title:row.title,employer:row.employer_name||'Nhà tuyển dụng',operator:row.operator||null,
    department:row.department||'Khác',location:row.location||'Phú Quốc',zone:row.zone||'Phú Quốc',employment:row.employment||'Chưa xác nhận',
    experience:row.experience||'Chưa xác nhận',english:row.english||'Chưa xác nhận',salary:row.salary_text||null,
    serviceCharge:row.service_charge_state==='yes',staffHouse:row.staff_house_state==='yes',meals:row.meals_text||null,shuttle:row.shuttle_state==='yes',offDays:row.off_days_text||null,
    urgent:Boolean(row.urgent),fresh:row.freshness_status==='fresh',freshnessStatus:row.freshness_status,
    lastChecked:row.last_seen_at?String(row.last_seen_at).slice(0,10):null,description:row.description||'',tags,
    sourceType:row.source_url?'Nguồn tuyển dụng chính thức':verified?'Employer confirmed':'Nguồn hệ thống',
    sourceUrl:row.source_url||null,verifiedByEmployer:verified,employerConfirmedAt:row.employer_confirmed_at||null
  };
}

async function publicJobs(env){
  const rows=await env.DB.prepare(`SELECT j.id,j.title,j.department,j.location,j.zone,j.employment,j.experience,j.english,j.salary_text,j.service_charge_state,j.staff_house_state,j.meals_text,j.shuttle_state,j.off_days_text,j.urgent,j.freshness_status,j.last_seen_at,j.employer_confirmed_at,j.description,e.name employer_name,e.operator,(SELECT source_url FROM job_sources s WHERE s.job_id=j.id ORDER BY s.source_priority DESC,s.observed_at DESC LIMIT 1) source_url FROM jobs j LEFT JOIN employers e ON e.id=j.employer_id WHERE j.freshness_status!='expired' ORDER BY j.urgent DESC,j.employer_confirmed_at DESC,j.last_seen_at DESC LIMIT 200`).all();
  return (rows.results||[]).map(publicJob);
}

export async function runtimeJobsScript(env){
  try{
    const jobs=await publicJobs(env);const payload=JSON.stringify(jobs).replace(/</g,'\\u003c');
    return new Response(`window.PQC_JOBS = ${payload};\n`,{headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'public, max-age=60'}});
  }catch{
    return new Response(`console.warn('PhuQuocCareers runtime jobs unavailable; using static fallback');\n`,{status:503,headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'}});
  }
}

async function hrSession(req,env){
  const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))return null;const token=auth.slice(7).trim();if(!token)return null;
  const hash=await hashTrackingToken(token);const row=await env.DB.prepare(`SELECT s.hr_identity_id FROM employer_sessions s JOIN hr_identities i ON i.id=s.hr_identity_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND i.verification_status='verified' LIMIT 1`).bind(hash,now()).first();return row||null;
}
async function membership(env,hrIdentityId,employerId){return env.DB.prepare(`SELECT role FROM employer_memberships WHERE hr_identity_id=? AND employer_id=? AND status='active' LIMIT 1`).bind(hrIdentityId,employerId).first()}
function keyPart(value=''){return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'job'}

export async function publishDraft(req,env,draftId){
  const session=await hrSession(req,env);if(!session)return json({error:'unauthorized'},401);
  const draft=await env.DB.prepare(`SELECT d.*,e.name employer_name FROM job_drafts d JOIN employers e ON e.id=d.employer_id WHERE d.id=?`).bind(draftId).first();if(!draft)return json({error:'not_found'},404);
  const member=await membership(env,session.hr_identity_id,draft.employer_id);if(!member||member.role==='viewer')return json({error:'forbidden'},403);
  if(draft.hr_identity_id!==session.hr_identity_id&&!['owner','admin'].includes(member.role))return json({error:'forbidden'},403);
  if(draft.status==='published'&&draft.published_job_id)return json({ok:true,status:'published',jobId:draft.published_job_id,idempotent:true});
  if(draft.input_type==='poster'&&draft.parser_status==='needs_parser')return json({error:'parser_incomplete'},409);
  const title=String(draft.title||'').trim();if(!title)return json({error:'title_required'},400);
  const ts=now();let job=await env.DB.prepare(`SELECT id FROM jobs WHERE employer_id=? AND lower(title)=lower(?) ORDER BY employer_confirmed_at DESC,last_seen_at DESC LIMIT 1`).bind(draft.employer_id,title).first();
  let jobId=job?.id||null;
  if(jobId){
    await env.DB.prepare(`UPDATE jobs SET department=?,experience=?,salary_text=?,staff_house_state=?,service_charge_state=?,off_days_text=?,description=COALESCE(?,description),freshness_status='fresh',employer_confirmed_at=?,last_seen_at=?,updated_at=? WHERE id=?`).bind(draft.department,draft.experience,draft.salary_text,draft.staff_house_state,draft.service_charge_state,draft.off_days_text,draft.raw_text||null,ts,ts,ts,jobId).run();
  }else{
    const digest=(await hashTrackingToken(`${draft.employer_id}|${title.toLowerCase()}`)).slice(0,16);jobId=`job_hr_${digest}`;const canonical=`hr|${draft.employer_id}|${keyPart(title)}`;
    await env.DB.prepare(`INSERT INTO jobs(id,canonical_key,employer_id,title,original_title,department,location,experience,salary_text,service_charge_state,staff_house_state,off_days_text,urgent,freshness_status,first_seen_at,last_seen_at,employer_confirmed_at,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(jobId,canonical,draft.employer_id,title,title,draft.department,'Phú Quốc',draft.experience,draft.salary_text,draft.service_charge_state,draft.staff_house_state,draft.off_days_text,0,'fresh',ts,ts,ts,draft.raw_text||null,ts,ts).run();
  }
  if(draft.source_url){
    const sourceId=id('src');await env.DB.prepare(`INSERT OR IGNORE INTO job_sources(id,job_id,source_id,source_job_id,source_url,observed_at,source_priority) VALUES(?,?,?,?,?,?,?)`).bind(sourceId,jobId,'employer-provided-url',draft.id,draft.source_url,ts,120).run();
  }
  await env.DB.prepare(`UPDATE job_drafts SET status='published',parser_status='confirmed',published_job_id=?,updated_at=? WHERE id=?`).bind(jobId,ts,draft.id).run();
  try{await env.DB.prepare(`INSERT INTO events(id,actor_type,actor_id,event_type,job_id,employer_id,source_channel,payload_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id('evt'),'hr_identity',session.hr_identity_id,'job_published',jobId,draft.employer_id,'direct',JSON.stringify({draftId:draft.id}),ts).run()}catch{}
  return json({ok:true,status:'published',jobId,employer:draft.employer_name},201);
}
