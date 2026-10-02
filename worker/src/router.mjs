import core from './index.mjs';
import {runtimeJobsScript,publishDraft} from './extensions.mjs';
import {jobDrafts} from './drafts.mjs';
import {createHrLoginLink,redeemHrLogin} from './auth.mjs';

export default {
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(req.method==='GET'&&url.pathname==='/api/jobs.js')return runtimeJobsScript(env);
    if(req.method==='POST'&&url.pathname==='/api/hr/session/redeem')return redeemHrLogin(req,env);
    if((req.method==='GET'||req.method==='POST')&&url.pathname==='/api/hr/job-drafts')return jobDrafts(req,env);
    const publish=url.pathname.match(/^\/api\/hr\/job-drafts\/([^/]+)\/publish$/);
    if(req.method==='POST'&&publish)return publishDraft(req,env,decodeURIComponent(publish[1]));
    const loginLink=url.pathname.match(/^\/api\/internal\/hr-identities\/([^/]+)\/login-link$/);
    if(req.method==='POST'&&loginLink)return createHrLoginLink(req,env,decodeURIComponent(loginLink[1]));
    return core.fetch(req,env,ctx);
  }
};
