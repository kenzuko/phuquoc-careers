export function dedupeJobs(jobs){
  const map=new Map();
  for(const job of jobs){
    const key=job.canonicalKey;
    const current=map.get(key);
    if(!current){map.set(key,job);continue;}
    const preferred=(job.sourcePriority||0)>(current.sourcePriority||0)?job:current;
    const other=preferred===job?current:job;
    preferred.provenance=[...(preferred.provenance||[]),...(other.provenance||[])].filter((v,i,a)=>a.findIndex(x=>x.sourceId===v.sourceId&&x.sourceJobId===v.sourceJobId&&x.url===v.url)===i);
    preferred.firstSeenAt=[preferred.firstSeenAt,other.firstSeenAt].filter(Boolean).sort()[0]||null;
    preferred.lastSeenAt=[preferred.lastSeenAt,other.lastSeenAt].filter(Boolean).sort().at(-1)||null;
    map.set(key,preferred);
  }
  return [...map.values()];
}
