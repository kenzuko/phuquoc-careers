const decodeEntities=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const stripTags=s=>decodeEntities(String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const abs=(href,base)=>{try{return new URL(href,base).toString()}catch{return null}};

export function parseRobots(text='', userAgent='*'){
  const groups=[];let current=null;
  for(const raw of String(text).split(/\r?\n/)){
    const line=raw.replace(/#.*/,'').trim();if(!line) continue;
    const m=line.match(/^([^:]+):\s*(.*)$/);if(!m) continue;
    const k=m[1].toLowerCase(),v=m[2].trim();
    if(k==='user-agent'){current={agents:[v.toLowerCase()],allow:[],disallow:[]};groups.push(current);continue}
    if(!current) continue;
    if(k==='allow') current.allow.push(v);
    if(k==='disallow') current.disallow.push(v);
  }
  const ua=userAgent.toLowerCase();
  const matches=groups.filter(g=>g.agents.some(a=>a==='*'||ua.includes(a)));
  return matches;
}
export function robotsAllows(text,url,userAgent='PhuQuocCareersBot'){
  const path=new URL(url).pathname||'/';
  const rules=parseRobots(text,userAgent);let best=null;
  for(const g of rules){
    for(const p of g.allow){if(p && path.startsWith(p) && (!best||p.length>best.len)) best={allow:true,len:p.length}}
    for(const p of g.disallow){if(p && path.startsWith(p) && (!best||p.length>best.len)) best={allow:false,len:p.length}}
  }
  return best?best.allow:true;
}
export function extractJsonLd(html){
  const out=[];const re=/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m;
  while((m=re.exec(html))){
    try{const parsed=JSON.parse(m[1].trim());const stack=Array.isArray(parsed)?[...parsed]:[parsed];while(stack.length){const x=stack.shift();if(!x||typeof x!=='object') continue;if(Array.isArray(x['@graph'])) stack.push(...x['@graph']);if(x['@type']==='JobPosting'||(Array.isArray(x['@type'])&&x['@type'].includes('JobPosting'))) out.push(x)}}catch{}
  }
  return out;
}
export function jsonLdToRaw(x,url){
  const org=x.hiringOrganization||{};const loc=Array.isArray(x.jobLocation)?x.jobLocation[0]:x.jobLocation||{};const addr=loc.address||{};
  const location=[addr.streetAddress,addr.addressLocality,addr.addressRegion,addr.addressCountry].filter(Boolean).join(', ') || stripTags(x.jobLocation?.name||'');
  const base=x.baseSalary?.value;let salary=null;if(base){const min=base.minValue??base.value,max=base.maxValue;if(min!=null) salary=max!=null?`${min} - ${max} ${x.baseSalary?.currency||''}`:`${min} ${x.baseSalary?.currency||''}`}
  return {sourceJobId:x.identifier?.value||x.identifier||null,title:stripTags(x.title),employer:stripTags(org.name||''),location,department:stripTags(x.industry||x.occupationalCategory||''),employment:Array.isArray(x.employmentType)?x.employmentType.join(' · '):stripTags(x.employmentType||''),salary,url:x.url||url,description:stripTags(x.description||'')};
}
export function extractJobLinks(html,baseUrl){
  const links=[];const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
  while((m=re.exec(html))){const href=abs(m[1],baseUrl);if(!href) continue;const text=stripTags(m[2]);if(/\/job\//i.test(href)||/\/jobs\//i.test(href)||/jobid=|job_id=/i.test(href)) links.push({url:href,text});}
  return [...new Map(links.map(x=>[x.url,x])).values()];
}
export function looksPhuQuoc(raw){const t=[raw.title,raw.employer,raw.location,raw.description].filter(Boolean).join(' ').toLowerCase();return /phu\s*quoc|phú\s*quốc|hon\s*thom|hòn\s*thơm|duong\s*to|dương\s*tơ/.test(t)}
