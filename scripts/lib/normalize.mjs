import crypto from 'node:crypto';

const SPACE=/\s+/g;
const clean=s=>String(s??'').replace(SPACE,' ').trim();
const stripSuffix=title=>clean(title)
  .replace(/\s*[-–—]\s*Phu\s*Quoc\b.*$/i,'')
  .replace(/\s*[-–—]\s*Phú\s*Quốc\b.*$/i,'')
  .trim();
const slug=s=>clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export function mapDepartment(raw=''){
  const t=clean(raw).toLowerCase();
  if(/food|beverage|culinary|restaurant|f&b|pastry|kitchen/.test(t)) return 'F&B';
  if(/human resources|people & culture|people and culture|nhân sự/.test(t)) return 'Nhân sự';
  if(/reservation/.test(t)) return 'Reservations';
  if(/front office|guest services|rooms/.test(t)) return 'Front Office';
  if(/wellness|spa|recreation|kids club/.test(t)) return 'Spa & Wellness';
  if(/engineering|maintenance/.test(t)) return 'Kỹ thuật';
  if(/sales|marketing/.test(t)) return 'Sales & Marketing';
  if(/administrative|assistant/.test(t)) return 'Hành chính';
  if(/property leadership|general manager|hotel manager/.test(t)) return 'Quản lý khách sạn';
  return clean(raw)||'Khác';
}

export function inferZone(location=''){
  const t=clean(location).toLowerCase();
  if(/hon thom|hòn thơm|an thoi|an thới|hamlet 7/.test(t)) return 'Nam đảo';
  if(/duong to|dương tơ|duong bao|dương bào|marina/.test(t)) return 'Bãi Trường';
  if(/duong dong|dương đông/.test(t)) return 'Dương Đông';
  if(/ganh dau|gành dầu|bai dai|bãi dài/.test(t)) return 'Bắc đảo';
  return 'Phú Quốc';
}

export function canonicalKey(item){
  const employer=slug(item.employer);
  const title=slug(stripSuffix(item.title));
  const zone=slug(inferZone(item.location));
  return `${employer}::${title}::${zone}`;
}

export function stableId(item){
  const operator=slug(item.operator||'');
  const sourceId=slug(item.sourceJobId||'');
  if(sourceId) return `${operator||'job'}-${sourceId}`.slice(0,120);
  return 'job-'+crypto.createHash('sha1').update(canonicalKey(item)).digest('hex').slice(0,12);
}

export function normalizeItem(raw, source){
  const benefits=raw.benefits||{};
  const normalized={
    id: stableId({...raw,operator:source.operator}),
    canonicalKey: canonicalKey(raw),
    sourceJobId: raw.sourceJobId||null,
    title: stripSuffix(raw.title),
    originalTitle: clean(raw.title),
    employer: clean(raw.employer),
    operator: source.operator,
    department: mapDepartment(raw.department||raw.title),
    location: clean(raw.location)||'Phú Quốc',
    zone: inferZone(raw.location),
    salary: raw.salary??null,
    serviceCharge: benefits.serviceCharge===true?true:benefits.serviceCharge===false?false:null,
    staffHouse: benefits.staffHouse===true?true:benefits.staffHouse===false?false:null,
    staffHouseMentioned: benefits.staffHouse==='mentioned',
    meals: benefits.meals??null,
    shuttle: benefits.shuttle===true?true:benefits.shuttle===false?false:null,
    offDays: benefits.offDays??null,
    experience: raw.experience||raw.level||'Chưa xác nhận',
    english: raw.english||'Chưa xác nhận',
    employment: raw.employment||'Chưa xác nhận',
    urgent: Boolean(raw.urgent),
    verifiedByEmployer: false,
    sourceType: 'Official career page',
    sourceId: source.id,
    sourceUrl: raw.url||source.url,
    sourcePriority: source.priority||0,
    sourceObservedAt: raw.sourceObservedAt||null,
    lastChecked: raw.sourceObservedAt ? new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(raw.sourceObservedAt)) : null,
    firstSeenAt: raw.firstSeenAt||null,
    lastSeenAt: raw.lastSeenAt||null,
    freshness: raw.freshness||{status:'fresh',missingRuns:0},
    fresh: (raw.freshness?.status||'fresh')==='fresh',
    provenance: [{sourceId:source.id,sourceJobId:raw.sourceJobId||null,url:raw.url||source.url}],
    description: raw.description||`${stripSuffix(raw.title)} tại ${clean(raw.employer)}. Thông tin được chuẩn hóa từ nguồn tuyển dụng chính thức; trường chưa thấy trong nguồn được giữ là chưa xác nhận.`,
    tags: [mapDepartment(raw.department||raw.title), inferZone(raw.location), raw.level].filter(Boolean)
  };
  return normalized;
}
