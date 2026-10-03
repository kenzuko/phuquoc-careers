import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const strict=process.argv.includes('--strict');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=msg=>{console.error(`DEPLOY CHECK FAILED: ${msg}`);process.exitCode=1};
const ok=msg=>console.log(`ok: ${msg}`);

const wrangler=read('wrangler.toml');
const router=read('worker/src/router.mjs');
const gitignore=read('.gitignore');
const assetsignore=read('.assetsignore');

if(!wrangler.includes('main = "worker/src/router.mjs"'))fail('Worker entrypoint is not router.mjs');else ok('Worker entrypoint');
const legacyWorkerFirst=wrangler.includes('run_worker_first = [ "/", "/api/*" ]');
const fullWorkerFirst=wrangler.includes('run_worker_first = true');
const safeAssetFallback=router.includes("coreResponse.status===404")&&router.includes("!url.pathname.startsWith('/api/')")&&router.includes('env.ASSETS.fetch(req)');
if(legacyWorkerFirst)ok('root + same-origin /api routing');
else if(fullWorkerFirst&&safeAssetFallback)ok('full Worker-first routing with explicit non-API static fallback');
else fail('Static assets are not routed safely through the Worker');
if(fullWorkerFirst&&!router.includes("url.hostname==='www.phuquoccareers.com'"))fail('full Worker-first routing must preserve canonical www redirect');
if(!wrangler.includes('html_handling = "none"'))fail('HTML handling must preserve explicit .html routes used by the approved V1 frontend');else ok('explicit HTML route handling');
if(!wrangler.includes('required = [ "PII_KEY", "INTERNAL_API_TOKEN" ]'))fail('required secrets are not declared');else ok('required secret declaration');
for(const binding of ['APPLICATION_RATE_LIMITER','CLAIM_RATE_LIMITER']){
  if(!wrangler.includes(`name = "${binding}"`))fail(`missing rate-limit binding ${binding}`);else ok(`rate-limit binding ${binding}`);
}
for(const flag of ['CANDIDATE_WRITES_ENABLED','EMPLOYER_CLAIMS_ENABLED','HR_AUTH_MODE']){
  if(!wrangler.includes(`${flag} = `))fail(`missing explicit launch switch ${flag}`);else ok(`launch switch ${flag}`);
}
if(!gitignore.includes('.dev.vars')||!gitignore.includes('.env'))fail('local secret files are not ignored');else ok('local secret ignore rules');
for(const p of ['worker/','migrations/','pipeline/','scripts/','tests/','docs/','wrangler.toml']){
  if(!assetsignore.includes(p))fail(`static asset upload does not exclude ${p}`);
}
if(strict&&wrangler.includes('REPLACE_AFTER_D1_CREATE'))fail('D1 database_id is still the placeholder');
else if(wrangler.includes('REPLACE_AFTER_D1_CREATE'))console.log('note: D1 database_id is intentionally still a placeholder before first cloud provision');
else ok('real D1 database_id present');

const files=fs.readdirSync(path.join(root,'migrations')).filter(x=>/^\d{4}_.+\.sql$/.test(x)).sort();
const versions=files.map(x=>Number(x.slice(0,4)));
for(let i=0;i<versions.length;i++){
  const expected=i+1;
  if(versions[i]!==expected)fail(`migration sequence gap/duplicate near ${files[i]} (expected ${String(expected).padStart(4,'0')})`);
}
if(versions.length)ok(`migration sequence 0001 -> ${String(versions.at(-1)).padStart(4,'0')}`);

const launch={
  candidateWrites:/CANDIDATE_WRITES_ENABLED\s*=\s*"true"/.test(wrangler),
  employerClaims:/EMPLOYER_CLAIMS_ENABLED\s*=\s*"true"/.test(wrangler),
  hrAuth:/HR_AUTH_MODE\s*=\s*"enabled"/.test(wrangler)
};
console.log('launch switches:',launch);
if(!process.exitCode)console.log(strict?'Deployment config is ready for cloud provisioning.':'Deployment config structure is valid.');
