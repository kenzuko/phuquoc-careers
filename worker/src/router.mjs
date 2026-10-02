import core from './index.mjs';
import {runtimeJobsScript,publishDraft} from './extensions.mjs';

export default {
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(req.method==='GET'&&url.pathname==='/api/jobs.js')return runtimeJobsScript(env);
    const publish=url.pathname.match(/^\/api\/hr\/job-drafts\/([^/]+)\/publish$/);
    if(req.method==='POST'&&publish)return publishDraft(req,env,decodeURIComponent(publish[1]));
    return core.fetch(req,env,ctx);
  }
};
