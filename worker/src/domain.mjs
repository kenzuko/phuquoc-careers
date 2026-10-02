export const INTENTS=new Set(['browsing','open_to_offers','actively_looking','available_soon','available_now']);
export const APPLICATION_STATUSES=new Set(['submitted','viewed','shortlisted','interview','offer','joined','rejected','withdrawn']);
export const SOURCE_CHANNELS=new Set(['direct','facebook','zalo','google','referral','other']);
export function normalizeSourceChannel(input=''){const v=String(input||'').trim().toLowerCase();return SOURCE_CHANNELS.has(v)?v:'direct'}
export function normalizePhone(input=''){return String(input).replace(/[^0-9+]/g,'').replace(/^\+84/,'0')}
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
export function intentExpiry(now=new Date(),days=30){const d=new Date(now);d.setUTCDate(d.getUTCDate()+days);return d.toISOString()}
