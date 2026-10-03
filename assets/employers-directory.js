(function(){
  const jobs=window.PQC_JOBS||[];const root=document.getElementById('candidateEmployers');if(!root)return;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const groups=new Map();
  jobs.forEach(j=>{const name=(j.employer||'').trim();if(!name)return;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(j)});
  const rows=[...groups.entries()].map(([name,list])=>{
    const operator=[...new Set(list.map(j=>j.operator).filter(Boolean))][0]||'';
    const zones=[...new Set(list.map(j=>j.zone||j.location).filter(Boolean))];
    const deps=[...new Set(list.map(j=>j.department).filter(Boolean))];
    const direct=list.some(j=>j.verifiedByEmployer===true);
    const official=list.every(j=>/official/i.test(j.sourceType||''));
    const latest=list.map(j=>j.lastChecked).filter(Boolean)[0]||'Chưa rõ';
    return {name,list,operator,zones,deps,direct,official,latest};
  }).sort((a,b)=>b.list.length-a.list.length||a.name.localeCompare(b.name,'vi'));
  root.innerHTML=rows.length?rows.map(x=>{
    const initials=x.name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
    const trust=x.direct?'Đã xác minh trực tiếp':x.official?'Nguồn chính thức đã đối chiếu':'Đang đối chiếu nguồn';
    const cls=x.direct?'':'pending';
    return `<article class="candidate-employer-card"><div class="candidate-employer-mark">${esc(initials||'PQ')}</div><div><h2>${esc(x.name)}</h2><p>${x.operator?`Vận hành bởi ${esc(x.operator)} · `:''}${esc(x.zones.join(' · ')||'Phú Quốc')}</p><div class="candidate-employer-meta"><span>${x.list.length} việc đang mở</span><span>${x.deps.length} nhóm nghề</span><span>Kiểm tra ${esc(x.latest)}</span></div></div><div class="candidate-employer-trust"><strong class="${cls}">${esc(trust)}</strong><span>${x.direct?'Doanh nghiệp đã xác nhận với PhuQuocCareers':'Chưa mặc định là employer verified'}</span></div><a href="employer-profile.html?name=${encodeURIComponent(x.name)}">Xem hồ sơ, liên hệ và các việc đang mở →</a></article>`;
  }).join(''):'<p>Chưa có nhà tuyển dụng đủ dữ liệu để hiển thị.</p>';
})();