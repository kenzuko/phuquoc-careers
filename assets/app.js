(function(){
  const jobs = window.PQC_JOBS || [];
  const byId = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const activeCount = jobs.filter(j=>j.fresh).length;

  function benefitTags(j){
    const tags=[];
    if(j.staffHouse===true) tags.push('Staff house');
    if(j.serviceCharge===true) tags.push('Service charge');
    if(j.meals) tags.push(j.meals+' bữa/ngày');
    if(j.shuttle===true) tags.push('Shuttle');
    tags.push(...(j.tags||[]).slice(0,2));
    return [...new Set(tags)].slice(0,4);
  }
  function jobCard(j){
    const init=j.employer.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
    return `<a class="job-card" href="job.html?id=${encodeURIComponent(j.id)}">
      <div class="job-top"><div class="brand-badge">${esc(init)}</div><div><h3>${esc(j.title)}</h3><div class="employer">${esc(j.employer)}</div></div></div>
      <div class="meta"><span>📍 ${esc(j.location)}</span><span>💼 ${esc(j.experience)}</span><span>🕘 ${esc(j.employment)}</span></div>
      <div class="benefits">${benefitTags(j).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}${j.urgent?'<span class="tag warn">Tuyển gấp</span>':''}</div>
      <div class="source"><span>${j.verifiedByEmployer?'Employer confirmed':'Nguồn tuyển dụng chính thức'}</span><span>Kiểm tra ${esc(j.lastChecked)}</span></div>
    </a>`;
  }
  function renderJobs(target, list, limit){
    const el=byId(target); if(!el) return;
    const subset=typeof limit==='number'?list.slice(0,limit):list;
    el.innerHTML=subset.map(jobCard).join('') || `<div class="notice">Chưa có vị trí phù hợp với bộ lọc này.</div>`;
  }
  renderJobs('featuredJobs',jobs,4);

  const tabs=document.querySelectorAll('.decision-tab');
  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    const smart=byId('smartBox'), manual=byId('manualBox');
    if(t.dataset.tab==='manual'){smart?.classList.add('hide');manual?.classList.add('active')} else {smart?.classList.remove('hide');manual?.classList.remove('active')}
  }));
  document.querySelectorAll('[data-quick]').forEach(c=>c.addEventListener('click',()=>{const q=byId('smartQuery'); if(q){q.value=c.dataset.quick;q.focus()}}));

  function goSmart(q){
    if(!q.trim()) return;
    location.href='jobs.html?q='+encodeURIComponent(q.trim());
  }
  byId('smartGo')?.addEventListener('click',()=>goSmart(byId('smartQuery').value));
  byId('smartQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter')goSmart(e.target.value)});
  byId('manualGo')?.addEventListener('click',()=>{
    const p=new URLSearchParams();
    const kw=byId('manualKeyword')?.value||''; const dep=byId('manualDept')?.value||''; const z=byId('manualZone')?.value||'';
    if(kw)p.set('q',kw); if(dep)p.set('dept',dep); if(z)p.set('zone',z); location.href='jobs.html?'+p;
  });

  function parseIntent(q){
    const t=q.toLowerCase(); const f={};
    const map=[['F&B',['phục vụ','f&b','nhà hàng','restaurant','bartender']],['Nhân sự',['nhân sự','hr','human resources']],['Spa & Wellness',['spa','wellness','gym','fitness']],['Reservations',['đặt phòng','reservation']],['Housekeeping',['buồng phòng','housekeeping']],['Front Office',['lễ tân','front office','reception']]];
    for(const [dep,keys] of map) if(keys.some(k=>t.includes(k))) f.department=dep;
    if(t.includes('hòn thơm')) f.zone='Nam đảo';
    if(t.includes('nam đảo')) f.zone='Nam đảo';
    if(t.includes('staff house')||t.includes('chỗ ở')||t.includes('nhà ở')) f.staffHouse=true;
    if(t.includes('gấp')||t.includes('ngay')) f.urgent=true;
    return f;
  }
  function applyFilters(list, params){
    let out=[...list]; const q=(params.q||'').toLowerCase(); const intent=parseIntent(q);
    const dep=params.dept||intent.department; const zone=params.zone||intent.zone;
    if(dep) out=out.filter(j=>j.department===dep || j.department.toLowerCase().includes(dep.toLowerCase()));
    if(zone) out=out.filter(j=>j.zone===zone || j.location.toLowerCase().includes(zone.toLowerCase()));
    if(intent.staffHouse) out=out.filter(j=>j.staffHouse===true || (j.tags||[]).some(x=>x.toLowerCase().includes('accommodation')));
    if(intent.urgent) out=out.filter(j=>j.urgent);
    if(q && !dep && !zone && !intent.staffHouse && !intent.urgent){out=out.filter(j=>[j.title,j.employer,j.department,j.location,...(j.tags||[])].join(' ').toLowerCase().includes(q));}
    return out;
  }

  if(byId('resultList')){
    const p=new URLSearchParams(location.search); const params={q:p.get('q')||'',dept:p.get('dept')||'',zone:p.get('zone')||''};
    const qin=byId('resultQuery'); if(qin) qin.value=params.q;
    const filtered=applyFilters(jobs,params); renderJobs('resultList',filtered);
    byId('resultCount').textContent=filtered.length;
    byId('activeCount').textContent=filtered.filter(j=>j.fresh).length;
    const intent=parseIntent(params.q); const summary=[];
    if(intent.department) summary.push(intent.department); if(intent.staffHouse) summary.push('ưu tiên staff house'); if(intent.zone) summary.push(intent.zone); if(intent.urgent) summary.push('cần việc sớm');
    const si=byId('intentSummary'); if(si) si.textContent=summary.length?'Hệ thống hiểu: '+summary.join(' · '):'Bạn đang tự tìm việc. Có thể dùng bộ lọc bên trái để thu hẹp kết quả.';
    byId('resultSearch')?.addEventListener('click',()=>goSmart(qin.value));
    document.querySelectorAll('[data-filter-dept]').forEach(cb=>cb.addEventListener('change',()=>{const checked=[...document.querySelectorAll('[data-filter-dept]:checked')].map(x=>x.value);const l=checked.length?jobs.filter(j=>checked.includes(j.department)):jobs;renderJobs('resultList',l);byId('resultCount').textContent=l.length}));
  }

  if(byId('jobDetail')){
    const id=new URLSearchParams(location.search).get('id')||jobs[0]?.id; const j=jobs.find(x=>x.id===id)||jobs[0];
    if(j){
      byId('detailTitle').textContent=j.title; byId('detailEmployer').textContent=j.employer; byId('detailLocation').textContent=j.location; byId('detailDesc').textContent=j.description;
      const fields=[['Bộ phận',j.department],['Khu vực',j.zone],['Kinh nghiệm',j.experience],['Tiếng Anh',j.english],['Lương',j.salary||'Chưa công khai'],['Service charge',j.serviceCharge===true?'Có':j.serviceCharge===false?'Không':'Chưa xác nhận'],['Staff house',j.staffHouse===true?'Có':j.staffHouse===false?'Không':'Chưa xác nhận'],['Ngày nghỉ',j.offDays||'Chưa xác nhận']];
      byId('factGrid').innerHTML=fields.map(([a,b])=>`<div class="fact"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
      byId('sourceLink').href=j.sourceUrl; byId('sourceType').textContent=j.sourceType; byId('sourceChecked').textContent=j.lastChecked;
      byId('interestBtn')?.addEventListener('click',()=>openModal('interestModal'));
      byId('applyBtn')?.addEventListener('click',()=>openModal('applyModal'));
    }
  }

  function openModal(id){byId(id)?.classList.add('show')} window.PQC_closeModal=id=>byId(id)?.classList.remove('show');
  document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')}));
  document.querySelectorAll('[data-save-light]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem('pqc-light-profile','1');alert('Đã lưu trên thiết bị này. Không cần tạo tài khoản.');b.closest('.modal')?.classList.remove('show')}));

  if(byId('parseBtn')){
    byId('parseBtn').addEventListener('click',()=>{
      const text=byId('jdText').value.trim(); if(!text){alert('Dán JD hoặc nội dung tuyển dụng trước nhé.');return}
      const lower=text.toLowerCase();
      const title=(text.split('\n').map(x=>x.trim()).find(x=>x.length>3 && x.length<90)||'Vị trí tuyển dụng').replace(/^[-•*\d.\s]+/,'');
      const dept=lower.includes('human resources')||lower.includes('nhân sự')?'Nhân sự':lower.includes('food')||lower.includes('f&b')||lower.includes('restaurant')?'F&B':lower.includes('housekeeping')||lower.includes('buồng phòng')?'Housekeeping':lower.includes('front office')||lower.includes('lễ tân')?'Front Office':'Chưa xác định';
      const exp=(text.match(/(?:at least|tối thiểu|từ)\s*(\d+)\s*(?:year|năm)/i)||[])[1];
      const salary=(text.match(/(\d{1,2}(?:[.,]\d+)?)\s*(?:-|–|to)\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:triệu|million)/i)||[]);
      const fields={parseTitle:title,parseDept:dept,parseExp:exp?`Từ ${exp} năm`:'Chưa rõ',parseSalary:salary.length?`${salary[1]} - ${salary[2]} triệu`:'Chưa công khai',parseHouse:/(staff house|accommodation|nhà ở|chỗ ở)/i.test(text)?'Có đề cập':'Chưa xác nhận',parseSC:/(service charge|phí phục vụ)/i.test(text)?'Có đề cập':'Chưa xác nhận'};
      Object.entries(fields).forEach(([id,v])=>{if(byId(id))byId(id).textContent=v}); byId('parseResult').classList.add('show'); byId('parseResult').scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  if(byId('statJobs')) byId('statJobs').textContent=activeCount;
})();
