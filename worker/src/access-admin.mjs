const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();

function internalAuthorized(req,env){
  const expected=env.INTERNAL_API_TOKEN;if(!expected)return false;
  return (req.headers.get('authorization')||'')===`Bearer ${expected}`;
}

export async function adminAccessRoute(req,env,url){
  if(!url.pathname.startsWith('/api/internal/hr-identities/'))return null;
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);

  const memberships=url.pathname.match(/^\/api\/internal\/hr-identities\/([^/]+)\/memberships$/);
  if(req.method==='GET'&&memberships){
    const hrId=decodeURIComponent(memberships[1]).slice(0,160);
    const identity=await env.DB.prepare(`SELECT id,verification_status,email_domain,created_at,updated_at FROM hr_identities WHERE id=? LIMIT 1`).bind(hrId).first();
    if(!identity)return json({error:'not_found'},404);
    const rows=await env.DB.prepare(`SELECT m.id,m.role,m.status,m.created_at,m.updated_at,e.id employer_id,e.name employer_name,e.operator FROM employer_memberships m JOIN employers e ON e.id=m.employer_id WHERE m.hr_identity_id=? ORDER BY e.name`).bind(hrId).all();
    return json({identity:{id:identity.id,verificationStatus:identity.verification_status,emailDomain:identity.email_domain||null,createdAt:identity.created_at,updatedAt:identity.updated_at},memberships:(rows.results||[]).map(r=>({id:r.id,role:r.role,status:r.status,employerId:r.employer_id,employerName:r.employer_name,operator:r.operator||null,createdAt:r.created_at,updatedAt:r.updated_at}))});
  }

  const revoke=url.pathname.match(/^\/api\/internal\/hr-identities\/([^/]+)\/revoke-sessions$/);
  if(req.method==='POST'&&revoke){
    const hrId=decodeURIComponent(revoke[1]).slice(0,160);
    const identity=await env.DB.prepare(`SELECT id FROM hr_identities WHERE id=? LIMIT 1`).bind(hrId).first();
    if(!identity)return json({error:'not_found'},404);
    const ts=now();
    const result=await env.DB.prepare(`UPDATE employer_sessions SET revoked_at=? WHERE hr_identity_id=? AND revoked_at IS NULL AND expires_at>?`).bind(ts,hrId,ts).run();
    return json({ok:true,hrIdentityId:hrId,revokedAt:ts,revokedSessions:Number(result?.meta?.changes||0)});
  }

  return null;
}
