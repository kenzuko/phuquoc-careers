import fs from 'node:fs';
const jobs=JSON.parse(fs.readFileSync(new URL('../data/jobs.generated.json',import.meta.url),'utf8'));
const required=['id','canonicalKey','title','employer','operator','department','location','zone','sourceId','sourceUrl','freshness'];
const errors=[];
const ids=new Set();const keys=new Set();
for(const [i,j] of jobs.entries()){
  for(const f of required) if(j[f]===undefined||j[f]===null||j[f]==='') errors.push(`job[${i}] missing ${f}`);
  if(ids.has(j.id)) errors.push(`duplicate id ${j.id}`);ids.add(j.id);
  if(keys.has(j.canonicalKey)) errors.push(`duplicate canonicalKey ${j.canonicalKey}`);keys.add(j.canonicalKey);
  if(!/^https:\/\//.test(j.sourceUrl)) errors.push(`invalid sourceUrl ${j.id}`);
  if(j.salary!==null && typeof j.salary!=='string') errors.push(`salary must be string|null ${j.id}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`PASS ${jobs.length} normalized jobs, ${ids.size} unique ids, ${keys.size} unique canonical keys`);
