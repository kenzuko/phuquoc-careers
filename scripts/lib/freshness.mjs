export function updateFreshness(previous={}, observedJobs=[], observedAt){
  const next={...previous};
  const seen=new Set();
  for(const job of observedJobs){
    const key=job.canonicalKey;seen.add(key);
    const old=next[key]||{};
    next[key]={firstSeenAt:old.firstSeenAt||observedAt,lastSeenAt:observedAt,missingRuns:0,status:'fresh'};
  }
  for(const [key,old] of Object.entries(next)){
    if(seen.has(key)) continue;
    const miss=(old.missingRuns||0)+1;
    next[key]={...old,missingRuns:miss,status:miss>=3?'expired':miss>=1?'needs_recheck':'fresh'};
  }
  return next;
}

export function attachFreshness(job,state){
  const f=state[job.canonicalKey]||{status:'fresh',missingRuns:0};
  return {...job,firstSeenAt:f.firstSeenAt||null,lastSeenAt:f.lastSeenAt||null,freshness:{status:f.status,missingRuns:f.missingRuns||0},fresh:f.status==='fresh'};
}
