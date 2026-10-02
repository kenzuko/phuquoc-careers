import core from './index.mjs';
import {runtimeJobsScript,publishDraft} from './extensions.mjs';
import {jobDrafts} from './drafts.mjs';
import {publicWriteRoute} from './public-writes.mjs';
import {adminClaimRoute} from './admin.mjs';
import {adminAccessRoute} from './access-admin.mjs';
import {interviewRoute} from './interview.mjs';
import {offerRoute} from './offer.mjs';
import {followupRoute} from './followup.mjs';
import {retentionRoute} from './retention.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

function secure(response){
  const headers=new Headers(response.headers);
  headers.set('x-content-type-options','nosniff');
  headers.set('referrer-policy','no-referrer');
  headers.set('permissions-policy','camera=(), microphone=(), geolocation=()');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

function requestTooLarge(req){
  if(!['POST','PUT','PATCH'].includes(req.method))return false;
  const len=Number(req.headers.get('content-length')||0);
  return Number.isFinite(len)&&len>65536;
}

async function readiness(env){
  try{
    if(!env.DB)return json({ok:false,status:'not_ready',reason:'database_binding_missing'},503);
    await env.DB.prepare('SELECT 1 AS ok').first();
  }catch{
    return json({ok:false,status:'not_ready',reason:'database_unavailable'},503);
  }
  if(!env.PII_KEY||!env.INTERNAL_API_TOKEN)return json({ok:false,status:'not_ready',reason:'required_secret_missing'},503);
  return json({ok:true,status:'ready',service:'phuquoc-careers-api',launch:{candidateWrites:env.CANDIDATE_WRITES_ENABLED==='true',employerClaims:env.EMPLOYER_CLAIMS_ENABLED==='true',hrAuth:env.HR_AUTH_MODE==='enabled'}});
}

export default {
  async fetch(req,env,ctx){
    let response;
    try{
      const url=new URL(req.url);
      if(requestTooLarge(req))response=json({error:'payload_too_large'},413);
      else if(req.method==='GET'&&url.pathname==='/api/readiness')response=await readiness(env);
      else if(req.method==='GET'&&url.pathname==='/api/jobs.js')response=await runtimeJobsScript(env);
      else if(url.pathname.startsWith('/api/hr/')&&env.HR_AUTH_MODE!=='enabled')response=json({error:'feature_not_enabled',feature:'hr_auth'},503);
      else {
        const publicWrite=await publicWriteRoute(req,env,url);
        if(publicWrite)response=publicWrite;
        else {
          const interview=await interviewRoute(req,env,url);
          if(interview)response=interview;
          else {
            const offer=await offerRoute(req,env,url);
            if(offer)response=offer;
            else {
              const followup=await followupRoute(req,env,url);
              if(followup)response=followup;
              else {
                const retention=await retentionRoute(req,env,url);
                if(retention)response=retention;
                else {
                  const adminClaim=await adminClaimRoute(req,env,url);
                  if(adminClaim)response=adminClaim;
                  else {
                    const adminAccess=await adminAccessRoute(req,env,url);
                    if(adminAccess)response=adminAccess;
                    else if((req.method==='GET'||req.method==='POST')&&url.pathname==='/api/hr/job-drafts')response=await jobDrafts(req,env);
                    else {
                      const publish=url.pathname.match(/^\/api\/hr\/job-drafts\/([^/]+)\/publish$/);
                      if(req.method==='POST'&&publish)response=await publishDraft(req,env,decodeURIComponent(publish[1]));
                      else response=await core.fetch(req,env,ctx);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }catch{
      response=json({error:'internal_error'},500);
    }
    return secure(response);
  }
};
