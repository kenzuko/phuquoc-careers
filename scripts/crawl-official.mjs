import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {robotsAllows,extractJsonLd,jsonLdToRaw,extractJobLinks,looksPhuQuoc} from './lib/crawl.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=JSON.parse(fs.readFileSync(path.join(root,'pipeline/sources.json'),'utf8'));
const args=new Set(process.argv.slice(2));const only=(process.argv.find(x=>x.startsWith('--source='))||'').split('=')[1];const dry=args.has('--dry-run');const strict=args.has('--strict');
const UA='PhuQuocCareersBot/0.1 (+https://phuquoccareers.com/about-crawler)';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){const r=await fetch(url,{redirect:'follow',headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml'}});if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);return await r.text()}
async function allowed(url){const u=new URL(url);try{const r=await fetch(`${u.origin}/robots.txt`,{headers:{'user-agent':UA}});if(r.status===404) return true;if(!r.ok) throw new Error(`robots ${r.status}`);return robotsAllows(await r.text(),url,UA)}catch(e){throw new Error(`robots unavailable for ${u.origin}: ${e.message}`)}}
async function crawlSource(source){
  if(!(await allowed(source.url))) throw new Error('blocked by robots.txt');
  const listing=await get(source.url);const direct=extractJsonLd(listing).map(x=>jsonLdToRaw(x,source.url)).filter(looksPhuQuoc);const items=[...direct];
  const links=extractJobLinks(listing,source.url).slice(0,60);
  for(const link of links){if(items.some(x=>x.url===link.url)) continue;if(!(await allowed(link.url))) continue;await wait(700);let html;try{html=await get(link.url)}catch{continue}const parsed=extractJsonLd(html).map(x=>jsonLdToRaw(x,link.url));for(const item of parsed){if(looksPhuQuoc(item)) items.push(item)}}
  const uniq=[...new Map(items.map(x=>[(x.sourceJobId||x.url||x.title),x])).values()];
  return {sourceId:source.id,observedAt:new Date().toISOString(),sourceUrl:source.url,items:uniq};
}
let failed=0, succeeded=0;const report={startedAt:new Date().toISOString(),sources:[]};
for(const source of sources.filter(s=>s.enabled&&(!only||s.id===only))){
  try{const snap=await crawlSource(source);succeeded++;console.log(`${source.id}: ${snap.items.length} Phu Quoc jobs`);report.sources.push({id:source.id,ok:true,count:snap.items.length,observedAt:snap.observedAt});if(!dry){const stamp=snap.observedAt.replace(/[:.]/g,'-');fs.writeFileSync(path.join(root,'pipeline/raw',`${source.id}-${stamp}.json`),JSON.stringify(snap,null,2)+'\n')}}catch(e){failed++;report.sources.push({id:source.id,ok:false,error:e.message});console.error(`${source.id}: SKIP ${e.message}`)}
}
report.finishedAt=new Date().toISOString();report.succeeded=succeeded;report.failed=failed;if(!dry)fs.writeFileSync(path.join(root,'pipeline/run-report.json'),JSON.stringify(report,null,2)+'\n');if((strict&&failed)||(!succeeded&&failed))process.exitCode=2;
