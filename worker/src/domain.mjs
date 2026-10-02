export const INTENTS=new Set(['browsing','open_to_offers','actively_looking','available_soon','available_now']);
export const APPLICATION_STATUSES=new Set(['submitted','viewed','shortlisted','interview','offer','joined','rejected','withdrawn']);
export const SOURCE_CHANNELS=new Set(['direct','facebook','zalo','google','referral','other']);
export const WITHDRAWAL_REASONS=new Set(['accepted_other_offer','salary','location_transport','schedule','benefits','changed_mind','other']);
export const EMPLOYER_ROLES=new Set(['owner','admin','recruiter','hiring_manager']);
const FREE_EMAIL_DOMAINS=new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.com.vn','outlook.com','hotmail.com','live.com','icloud.com','me.com']);

export function normalizeSourceChannel(input=''){const v=String(input||'').trim().toLowerCase();return SOURCE_CHANNELS.has(v)?v:'direct'}
export function normalizePhone(input=''){return String(input).replace(/[^0-9+]/g,'').replace(/^\+84/,'0')}
export function normalizeWithdrawalReason(input=''){const v=String(input||'').trim().toLowerCase();return WITHDRAWAL_REASONS.has(v)?v:'other'}
export function normalizeEmail(input=''){return String(input||'').trim().toLowerCase()}
export function emailDomain(email=''){return normalizeEmail(email).split('@')[1]||''}
export function isWorkEmail(email=''){const domain=emailDomain(email);return Boolean(domain&&!FREE_EMAIL_DOMAINS.has(domain))}

export function validateIntent(body){
  if(!body||!INTENTS.has(body.intent)) return {ok:false,error:'invalid_intent'};
  return {ok:true,value:{intent:body.intent,jobId:body.jobId||null,sourceChannel:normalizeSourceChannel(body.sourceChannel)}};
}
export function validateApplication(body){
  if(!body?.jobId) return {ok:false,error:'job_required'};
  if(!String(body?.name||'').trim()) return {ok:false,error:'name_required'};
  const phone=normalizePhone(body?.phone||'');
  if(!/^0\d{8,10}$/.test(phone)) return {ok:false,error:'phone_invalid'};
  if(body?.consent!==true) return {ok:false,error:'consent_required'};
  return {ok:true,value:{jobId:String(body.jobId),name:String(body.name).trim(),phone,interviewPreference:body.interviewPreference||null,availableDate:body.availableDate||null,sourceChannel:normalizeSourceChannel(body.sourceChannel)}};
}
export function validateEmployerClaim(body){
  const employerName=String(body?.employerName||'').trim();if(!employerName)return {ok:false,error:'employer_required'};
  const email=normalizeEmail(body?.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {ok:false,error:'email_invalid'};
  const role=String(body?.role||'recruiter');if(!EMPLOYER_ROLES.has(role))return {ok:false,error:'role_invalid'};
  if(body?.consent!==true)return {ok:false,error:'consent_required'};
  const method=isWorkEmail(email)?'work_email':'manual';let proofUrl=null;
  if(body?.proofUrl){try{const u=new URL(String(body.proofUrl));if(!['http:','https:'].includes(u.protocol))throw new Error();proofUrl=u.toString()}catch{return {ok:false,error:'proof_url_invalid'}}}
  if(method==='manual'&&!proofUrl)return {ok:false,error:'proof_required'};
  return {ok:true,value:{employerName,email,emailDomain:emailDomain(email),role,method,proofUrl}};
}
export function intentExpiry(now=new Date(),days=30){const d=new Date(now);d.setUTCDate(d.getUTCDate()+days);return d.toISOString()}
export function canTransitionApplication(from,to){
  if(!APPLICATION_STATUSES.has(from)||!APPLICATION_STATUSES.has(to)||from===to)return false;
  if(from==='joined'||from==='rejected'||from==='withdrawn')return false;
  if(to==='withdrawn'||to==='rejected')return true;
  const order=['submitted','viewed','shortlisted','interview','offer','joined'];
  return order.indexOf(to)>order.indexOf(from);
}
