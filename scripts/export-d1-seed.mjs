import fs from 'node:fs';import crypto from 'node:crypto';
const jobs=JSON.parse(fs.readFileSync(new URL('../data/jobs.generated.json',import.meta.url),'utf8'));
const outDir=new URL('../pipeline/generated/',import.meta.url);fs.mkdirSync(outDir,{recursive:true});
const out=new URL('./d1-seed.sql',outDir);
const q=v=>v==null?'NULL':`'${String(v).replaceAll("'","''")}'`;
const bit=v=>v?1:0;
const slug=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const employerId=name=>'emp_'+crypto.createHash('sha1').update(name).digest('hex').slice(0,12);
const state=(v,mentioned=false)=>v===true?'yes':v===false?'no':mentioned?'mentioned':'unknown';
const observed=jobs.map(j=>j.lastSeenAt||j.sourceObservedAt).filter(Boolean).sort().at(-1)||new Date(0).toISOString();
// D1 remote execution does not accept SQL BEGIN/COMMIT wrappers in uploaded files.
// Keep the generated statements individually idempotent so the seed is safe to retry.
const lines=['PRAGMA foreign_keys = ON;'];
const seenEmp=new Set();
for(const j of jobs){
  const eid=employerId(j.employer);
  if(!seenEmp.has(eid)){
    seenEmp.add(eid);
    lines.push(`INSERT INTO employers(id,slug,name,operator,claim_status,created_at,updated_at) VALUES(${q(eid)},${q(slug(j.employer))},${q(j.employer)},${q(j.operator)},'unclaimed',${q(observed)},${q(observed)}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,operator=excluded.operator,updated_at=excluded.updated_at;`);
  }
  lines.push(`INSERT INTO jobs(id,canonical_key,employer_id,title,original_title,department,location,zone,employment,experience,english,salary_text,service_charge_state,staff_house_state,meals_text,shuttle_state,off_days_text,urgent,freshness_status,first_seen_at,last_seen_at,description,created_at,updated_at) VALUES(${q(j.id)},${q(j.canonicalKey)},${q(eid)},${q(j.title)},${q(j.originalTitle)},${q(j.department)},${q(j.location)},${q(j.zone)},${q(j.employment)},${q(j.experience)},${q(j.english)},${q(j.salary)},${q(state(j.serviceCharge))},${q(state(j.staffHouse,j.staffHouseMentioned))},${q(j.meals)},${q(state(j.shuttle))},${q(j.offDays)},${bit(j.urgent)},${q(j.freshness?.status||'fresh')},${q(j.firstSeenAt)},${q(j.lastSeenAt)},${q(j.description)},${q(observed)},${q(observed)}) ON CONFLICT(id) DO UPDATE SET canonical_key=excluded.canonical_key,employer_id=excluded.employer_id,title=excluded.title,original_title=excluded.original_title,department=excluded.department,location=excluded.location,zone=excluded.zone,employment=excluded.employment,experience=excluded.experience,english=excluded.english,salary_text=excluded.salary_text,service_charge_state=excluded.service_charge_state,staff_house_state=excluded.staff_house_state,meals_text=excluded.meals_text,shuttle_state=excluded.shuttle_state,off_days_text=excluded.off_days_text,urgent=excluded.urgent,freshness_status=excluded.freshness_status,first_seen_at=COALESCE(jobs.first_seen_at,excluded.first_seen_at),last_seen_at=excluded.last_seen_at,description=excluded.description,updated_at=excluded.updated_at;`);
  for(const p of j.provenance||[]){const sid='src_'+crypto.createHash('sha1').update([j.id,p.sourceId,p.sourceJobId,p.url].join('|')).digest('hex').slice(0,16);lines.push(`INSERT INTO job_sources(id,job_id,source_id,source_job_id,source_url,observed_at,source_priority) VALUES(${q(sid)},${q(j.id)},${q(p.sourceId)},${q(p.sourceJobId)},${q(p.url)},${q(j.sourceObservedAt||j.lastSeenAt||observed)},${Number(j.sourcePriority||0)}) ON CONFLICT(id) DO UPDATE SET observed_at=excluded.observed_at,source_priority=excluded.source_priority;`)}
}
fs.writeFileSync(out,lines.join('\n')+'\n');console.log(`WROTE ${jobs.length} jobs / ${seenEmp.size} employers -> pipeline/generated/d1-seed.sql`);
