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
  if(/nurse|nursing|medical|health care|healthcare|y tế|điều dưỡng/.test(t)) return 'Y tế & Chăm sóc';
  if(/housekeeping|room attendant|laundry|buồng phòng|giặt là/.test(t)) return 'Housekeeping';
  if(/food|beverage|culinary|restaurant|f&b|pastry|kitchen|chef|barista|bartender/.test(t)) return 'F&B';
  if(/human resources|people & culture|people and culture|nhân sự|talent/.test(t)) return 'Nhân sự';
  if(/reservation/.test(t)) return 'Reservations';
  if(/front office|guest services|guest service|regent service|front desk|reception|club manager/.test(t)) return 'Front Office';
  if(/wellness|spa|recreation|kids club|sports|leisure/.test(t)) return 'Spa & Wellness';
  if(/engineering|maintenance|facilities|kỹ thuật|bảo trì/.test(t)) return 'Kỹ thuật';
  if(/information technology|\bit\b|technology|systems|công nghệ/.test(t)) return 'Công nghệ';
  if(/procurement|purchasing|supply chain|mua hàng/.test(t)) return 'Mua hàng';
  if(/sales|marketing|revenue|communications|kinh doanh/.test(t)) return 'Sales & Marketing';
  if(/finance|accounting|accountant|business support|tài chính|kế toán|cost officer/.test(t)) return 'Tài chính & Kế toán';
  if(/administrative|assistant|office|hành chính/.test(t)) return 'Hành chính';
  if(/security|safety|loss prevention|an ninh/.test(t)) return 'An ninh & An toàn';
  if(/property leadership|general manager|hotel manager|duty manager/.test(t)) return 'Quản lý khách sạn';
  return clean(raw)||'Khác';
}

export function inferZone(location=''){
  const t=clean(location).toLowerCase();
  if(/hon thom|hòn thơm|an thoi|an thới|hamlet 7/.test(t)) return 'Nam đảo';
  if(/duong to|dương tơ|duong bao|dương bào|marina|sonasea|ban quy/.test(t)) return 'Bãi Trường';
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
  const operator=clean(raw.operator||source.operator);
  const title=stripSuffix(raw.title),employer=clean(raw.employer);
  const normalized={
    id: stableId({...raw,operator}),
    canonicalKey: canonicalKey(raw),
    sourceJobId: raw.sourceJobId||null,
    title,
    originalTitle: clean(raw.title),
    employer,
    operator,
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
    description: raw.description||`${employer} đang tuyển ${title} trên trang nghề nghiệp chính thức. Nguồn chưa nói rõ phần nào thì PhuQuocCareers để nguyên là chưa rõ, không tự điền thêm.`,
    tags: [mapDepartment(raw.department||raw.title), inferZone(raw.location), raw.level].filter(Boolean)
  };
  return normalized;
}
