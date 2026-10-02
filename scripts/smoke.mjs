const baseRaw=process.env.PQC_BASE_URL||process.argv[2];
if(!baseRaw){console.error('Usage: PQC_BASE_URL=https://example.com npm run smoke');process.exit(2)}
const base=baseRaw.replace(/\/$/,'');

async function check(path,{status=200,contains=null}={}){
  const res=await fetch(base+path,{redirect:'follow',headers:{'user-agent':'PhuQuocCareersSmoke/1.0'}});
  const text=await res.text();
  if(res.status!==status)throw new Error(`${path}: expected ${status}, got ${res.status}`);
  if(contains&&!text.includes(contains))throw new Error(`${path}: missing expected marker ${contains}`);
  console.log(`ok ${res.status} ${path}`);
  return {res,text};
}

await check('/',{contains:'PhuQuocCareers'});
await check('/jobs.html',{contains:'resultList'});
await check('/api/health',{contains:'phuquoc-careers-api'});
await check('/api/readiness',{contains:'"ready"'});
await check('/api/jobs.js',{contains:'window.PQC_JOBS'});
await check('/wrangler.toml',{status:404});
await check('/worker/src/router.mjs',{status:404});

console.log('Smoke test passed: static UI + API are same-origin and server-only files are not public.');
