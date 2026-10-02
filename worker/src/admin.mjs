import {decryptPII} from './crypto.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const STATUSES=new Set(['pending','approved','rejected','cancelled']);

function internalAuthorized(req,env){
  const expected=env.INTERNAL_API_TOKEN;if(!expected)return false;
  return (req.headers.get('authorization')||'')===`Bearer ${expected}`;
}

export async function adminClaimRoute(req,env,url){
  if(req.method!=='GET'||!url.pathname.startsWith('/api/internal/employer-claims'))return null;
  if(!internalAuthorized(req,env))return json({error:'unauthorized'},401);

  const detail=url.pathname.match(/^\/api\/internal\/employer-claims\/([^/]+)$/);
  if(detail){
    const claimId=decodeURIComponent(detail[1]).slice(0,160);
    const row=await env.DB.prepare(`SELECT c.*,e.name employer_name,e.operator,e.website FROM employer_claims c JOIN employers e ON e.id=c.employer_id WHERE c.id=? LIMIT 1`).bind(claimId).first();
    if(!row)return json({error:'not_found'},404);
    let email=null;
    try{email=await decryptPII(row.email_ciphertext,env.PII_KEY)}catch{return json({error:'pii_decrypt_failed'},500)}
    return json({
      id:row.id,status:row.status,employerId:row.employer_id,employerName:row.employer_name,operator:row.operator||null,website:row.website||null,
      requestedRole:row.requested_role,email,emailDomain:row.email_domain,verificationMethod:row.verification_method,proofUrl:row.proof_url||null,
      createdAt:row.created_at,updatedAt:row.updated_at,reviewedAt:row.reviewed_at||null
    });
  }

  if(url.pathname!=='/api/internal/employer-claims')return null;
  const requested=String(url.searchParams.get('status')||'pending').toLowerCase();
  if(!STATUSES.has(requested))return json({error:'invalid_status'},400);
  const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||50),1),100);
  const rows=await env.DB.prepare(`SELECT c.id,c.status,c.employer_id,c.requested_role,c.email_domain,c.verification_method,c.proof_url,c.created_at,c.updated_at,c.reviewed_at,e.name employer_name,e.operator FROM employer_claims c JOIN employers e ON e.id=c.employer_id WHERE c.status=? ORDER BY c.created_at ASC LIMIT ?`).bind(requested,limit).all();
  return json({status:requested,items:(rows.results||[]).map(r=>({
    id:r.id,employerId:r.employer_id,employerName:r.employer_name,operator:r.operator||null,requestedRole:r.requested_role,
    emailDomain:r.email_domain,verificationMethod:r.verification_method,proofUrl:r.proof_url||null,createdAt:r.created_at,updatedAt:r.updated_at,reviewedAt:r.reviewed_at||null
  }))});
}
