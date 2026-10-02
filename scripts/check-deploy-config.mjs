import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const strict=process.argv.includes('--strict');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=msg=>{console.error(`DEPLOY CHECK FAILED: ${msg}`);process.exitCode=1};
const ok=msg=>console.log(`ok: ${msg}`);

const wrangler=read('wrangler.toml');
const gitignore=read('.gitignore');
const assetsignore=read('.assetsignore');

if(!wrangler.includes('main = "worker/src/router.mjs"'))fail('Worker entrypoint is not router.mjs');else ok('Worker entrypoint');
if(!wrangler.includes('run_worker_first = [ "/api/*" ]'))fail('Static assets are not locked to same-origin /api/* Worker routing');else ok('same-origin /api routing');
if(!wrangler.includes('required = [ "PII_KEY", "INTERNAL_API_TOKEN" ]'))fail('required secrets are not declared');else ok('required secret declaration');
for(const binding of ['APPLICATION_RATE_LIMITER','CLAIM_RATE_LIMITER']){
  if(!wrangler.includes(`name = "${binding}"`))fail(`missing rate-limit binding ${binding}`);else ok(`rate-limit binding ${binding}`);
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

if(!process.exitCode)console.log(strict?'Deployment config is ready for cloud provisioning.':'Deployment config structure is valid.');
