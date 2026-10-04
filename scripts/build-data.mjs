import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeItem,isPastSourceExpiry} from './lib/normalize.mjs';
import {dedupeJobs} from './lib/dedupe.mjs';
import {updateFreshness,attachFreshness} from './lib/freshness.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const sources=read('pipeline/sources.json');
const sourceById=new Map(sources.map(x=>[x.id,x]));
const rawDir=path.join(root,'pipeline/raw');
const files=fs.readdirSync(rawDir).filter(x=>x.endsWith('.json')).sort();
const rawSnapshots=files.map(f=>read('pipeline/raw/'+f));
const latestBySource=new Map();
for(const snap of rawSnapshots){const old=latestBySource.get(snap.sourceId);if(!old||new Date(snap.observedAt)>new Date(old.observedAt))latestBySource.set(snap.sourceId,snap)}
let normalized=[];let latestObservedAt='';let expiredBySourceDate=0;
for(const [sourceId,snap] of latestBySource){
  const source=sourceById.get(sourceId);if(!source||!source.enabled) continue;
  latestObservedAt=!latestObservedAt||new Date(snap.observedAt)>new Date(latestObservedAt)?snap.observedAt:latestObservedAt;
  const rows=snap.items.map(item=>normalizeItem({...item,sourceObservedAt:snap.observedAt},source));
  for(const job of rows){if(isPastSourceExpiry(job.sourceValidThrough,job.sourceObservedAt)){expiredBySourceDate++;continue}normalized.push(job)}
}
normalized=dedupeJobs(normalized);
const previous=read('pipeline/state/jobs-state.json');
const nextState=updateFreshness(previous,normalized,latestObservedAt||new Date().toISOString());
normalized=normalized.map(j=>attachFreshness(j,nextState)).sort((a,b)=>(b.sourcePriority-a.sourcePriority)||a.employer.localeCompare(b.employer)||a.title.localeCompare(b.title));
write('pipeline/state/jobs-state.json',nextState);
write('data/jobs.generated.json',normalized);
const uiJobs=normalized.map(j=>({
  id:j.id,title:j.title,employer:j.employer,operator:j.operator,department:j.department,
  location:j.location,zone:j.zone,salary:j.salary,serviceCharge:j.serviceCharge,
  staffHouse:j.staffHouse,staffHouseMentioned:j.staffHouseMentioned,meals:j.meals,
  shuttle:j.shuttle,offDays:j.offDays,experience:j.experience,english:j.english,
  employment:j.employment,urgent:j.urgent,verifiedByEmployer:j.verifiedByEmployer,
  sourceType:j.sourceType,sourceUrl:j.sourceUrl,lastChecked:j.lastChecked,fresh:j.fresh,
  sourceValidThrough:j.sourceValidThrough,description:j.description,tags:j.tags
}));
const js=`window.PQC_JOBS = ${JSON.stringify(uiJobs)};\n`;
write('data/jobs.js',js);
const employers=Object.values(normalized.reduce((acc,j)=>{const key=j.employer;acc[key]??={name:j.employer,operator:j.operator,jobCount:0,freshJobCount:0,sources:new Set()};acc[key].jobCount++;if(j.fresh)acc[key].freshJobCount++;acc[key].sources.add(j.sourceId);return acc;},{})).map(e=>({...e,sources:[...e.sources]}));
write('data/employers.generated.json',employers);
const provenance={generatedAt:new Date().toISOString(),observedAt:latestObservedAt,sources:sources.map(s=>({id:s.id,domain:s.domain,url:s.url,enabled:s.enabled})),jobCount:normalized.length,freshJobCount:normalized.filter(x=>x.fresh).length,expiredBySourceDate};
write('data/provenance.generated.json',provenance);
console.log(JSON.stringify({ok:true,jobs:normalized.length,fresh:normalized.filter(x=>x.fresh).length,employers:employers.length,sources:latestBySource.size,expiredBySourceDate},null,2));
