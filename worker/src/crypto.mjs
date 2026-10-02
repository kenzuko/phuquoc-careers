const te=new TextEncoder();
const td=new TextDecoder();
function b64(bytes){return btoa(String.fromCharCode(...bytes))}
function unb64(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
async function keyFromSecret(secret){const raw=await crypto.subtle.digest('SHA-256',te.encode(secret));return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function encryptPII(value,secret){if(!secret) throw new Error('PII_KEY missing');const iv=crypto.getRandomValues(new Uint8Array(12));const key=await keyFromSecret(secret);const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,te.encode(String(value)));return `${b64(iv)}.${b64(new Uint8Array(cipher))}`}
export async function decryptPII(value,secret){const [iv,cipher]=String(value).split('.');const key=await keyFromSecret(secret);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},key,unb64(cipher));return td.decode(plain)}
export async function hashLookup(value,secret){const key=await crypto.subtle.importKey('raw',te.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,te.encode(String(value)));return Array.from(new Uint8Array(sig)).map(x=>x.toString(16).padStart(2,'0')).join('')}
