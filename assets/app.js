(function(){
  const jobs = window.PQC_JOBS || [];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const uniq = arr => [...new Set(arr.filter(Boolean))];
  const activeCount = jobs.filter(j=>j.fresh).length;
  const employers = uniq(jobs.map(j=>j.employer));

  function visualClass(j){
    const d=(j.department||'').toLowerCase();
    if(d.includes('f&b')) return 'visual-fb';
    if(d.includes('nhân sự')) return 'visual-hr';
    if(d.includes('spa')) return 'visual-spa';
    if(d.includes('giải trí')) return 'visual-fitness';
    return 'visual-res';
  }
  function companyInitials(name){return name.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase()}
  function levelOf(j){
    const text=((j.experience||'')+' '+(j.title||'')).toLowerCase();
    if(text.includes('director')) return 'Director';
    if(text.includes('manager')||text.includes('quản lý')) return 'Manager';
    return 'Entry';
  }
  function benefitTags(j){
    const tags=[];
    if(j.staffHouse===true) tags.push({text:'Staff house',kind:''});
    else if((j.tags||[]).some(x=>/accommodation/i.test(x))) tags.push({text:'Hỗ trợ lưu trú',kind:''});
    if(j.serviceCharge===true) tags.push({text:'Service charge',kind:''});
    if(j.meals) tags.push({text:`${j.meals} bữa/ngày`,kind:''});
    if(j.shuttle===true) tags.push({text:'Shuttle',kind:''});
    (j.tags||[]).slice(0,2).forEach(t=>tags.push({text:t,kind:'alt'}));
    return tags.filter((v,i,a)=>a.findIndex(x=>x.text===v.text)===i).slice(0,4);
  }
  function jobCard(j){
    return `<a class="job-card" href="job.html?id=${encodeURIComponent(j.id)}">
      <div class="job-visual ${visualClass(j)}"><span class="job-company">${esc(j.employer)}</span>${j.urgent?'<span class="job-badge">Tuyển gấp</span>':''}</div>
      <div class="job-card-body">
        <h3>${esc(j.title)}</h3>
        <div class="employer">${esc(j.employer)}</div>
        <div class="meta"><span>⌖ ${esc(j.location)}</span><span>▣ ${esc(j.experience)}</span><span>◷ ${esc(j.employment)}</span></div>
        <div class="benefits">${benefitTags(j).map(t=>`<span class="tag ${t.kind}">${esc(t.text)}</span>`).join('')}${!j.salary?'<span class="tag alt">Lương chưa công khai</span>':''}</div>
        <div class="source"><span>${j.verifiedByEmployer?'Employer confirmed':'Nguồn chính thức'}</span><span>Kiểm tra ${esc(j.lastChecked)}</span></div>
      </div>
    </a>`;
  }
  function renderJobs(target,list,limit){
    const el=$(target); if(!el) return;
    const rows=typeof limit==='number'?list.slice(0,limit):list;
    el.innerHTML=rows.length?rows.map(jobCard).join(''):`<div class="empty-state"><strong>Chưa thấy việc phù hợp.</strong><span>Thử bỏ bớt một điều kiện hoặc đổi từ khóa. Manual search vẫn luôn dùng được.</span></div>`;
  }

  function parseIntent(q){
    const t=(q||'').toLowerCase(); const f={raw:q||''};
    const map=[
      ['F&B',['phục vụ','f&b','nhà hàng','restaurant','bartender','bar','ẩm thực']],
      ['Nhân sự',['nhân sự','hr','human resources','people & culture']],
      ['Spa & Wellness',['spa','wellness','gym','fitness']],
      ['Reservations',['đặt phòng','reservation']],
      ['Housekeeping',['buồng phòng','housekeeping','room attendant']],
      ['Front Office',['lễ tân','front office','reception','guest service']],
      ['Giải trí',['giải trí','recreation','fitness','hoạt động biển']]
    ];
    for(const [dep,keys] of map){if(keys.some(k=>t.includes(k))){f.department=dep;break}}
    if(t.includes('hòn thơm')||t.includes('nam đảo')||t.includes('an thới')) f.zone='Nam đảo';
    else if(t.includes('dương đông')) f.zone='Dương Đông';
    else if(t.includes('bãi trường')) f.zone='Bãi Trường';
    else if(t.includes('bắc đảo')||t.includes('gành dầu')||t.includes('bãi dài')) f.zone='Bắc đảo';
    if(/staff house|chỗ ở|nhà ở|lưu trú/.test(t)) f.staffHouse=true;
    if(/service charge|phí phục vụ/.test(t)) f.serviceCharge=true;
    if(/gấp|ngay|sớm/.test(t)) f.urgent=true;
    if(/không cần kinh nghiệm|chưa có kinh nghiệm|mới ra trường/.test(t)) f.noExperience=true;
    if(/không cần tiếng anh|tiếng anh yếu|chưa biết tiếng anh/.test(t)) f.noEnglish=true;
    const salary=t.match(/(?:lương\s*)?(?:từ\s*)?(\d{1,2})(?:\s*(?:-|đến|tới)\s*(\d{1,2}))?\s*triệu/);
    if(salary){f.salaryMin=Number(salary[1]); if(salary[2]) f.salaryMax=Number(salary[2]);}
    return f;
  }
  function parseSalaryValue(s){
    if(!s) return null; const m=String(s).match(/(\d{1,2}(?:[.,]\d+)?)/); return m?Number(m[1].replace(',','.')):null;
  }
  function applyFilters(list,state){
    let out=[...list]; const intent=parseIntent(state.q||'');
    const deps=state.deps?.length?state.deps:(state.dept?[state.dept]:intent.department?[intent.department]:[]);
    const zones=state.zones?.length?state.zones:(state.zone?[state.zone]:intent.zone?[intent.zone]:[]);
    if(deps.length) out=out.filter(j=>deps.some(dep=>j.department===dep || j.department.toLowerCase().includes(dep.toLowerCase())));
    if(zones.length) out=out.filter(j=>zones.some(zone=>j.zone===zone || j.location.toLowerCase().includes(zone.toLowerCase())));
    if(state.staffHouse||intent.staffHouse) out=out.filter(j=>j.staffHouse===true || (j.tags||[]).some(x=>/accommodation|staff house/i.test(x)));
    if(state.urgent||intent.urgent) out=out.filter(j=>j.urgent);
    if(state.fresh) out=out.filter(j=>j.fresh);
    if(state.levels?.length) out=out.filter(j=>state.levels.includes(levelOf(j)));
    if(intent.noExperience) out=out.filter(j=>/entry|associate|không yêu cầu|intern|trainee/i.test((j.experience||'')+' '+(j.tags||[]).join(' ')));
    if(intent.noEnglish) out=out.filter(j=>!/có|tốt|professional/i.test(j.english||''));
    if(intent.salaryMin) out=out.filter(j=>{const n=parseSalaryValue(j.salary); return n===null || n>=intent.salaryMin-2});
    const q=(state.q||'').trim().toLowerCase();
    const recognized=Boolean(intent.department||intent.zone||intent.staffHouse||intent.urgent||intent.noExperience||intent.noEnglish||intent.salaryMin);
    if(q&&!recognized){out=out.filter(j=>[j.title,j.employer,j.operator,j.department,j.location,j.description,...(j.tags||[])].join(' ').toLowerCase().includes(q));}
    if(state.sort==='urgent') out.sort((a,b)=>Number(b.urgent)-Number(a.urgent));
    if(state.sort==='fresh') out.sort((a,b)=>String(b.lastChecked).localeCompare(String(a.lastChecked)));
    return out;
  }

  function openModal(id){$(id)?.classList.add('show')}
  window.PQC_closeModal=id=>$(id)?.classList.remove('show');
  document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')}));
  document.querySelectorAll('[data-open-login]').forEach(b=>b.addEventListener('click',()=>openModal('loginModal')));
  document.querySelectorAll('[data-open-hr-login]').forEach(b=>b.addEventListener('click',()=>openModal('hrLoginModal')));

  renderJobs('featuredJobs',jobs,4);
  if($('statJobs')) $('statJobs').textContent=activeCount;
  if($('statEmployers')) $('statEmployers').textContent=employers.length;
  if($('employerLogos')) $('employerLogos').innerHTML=employers.slice(0,6).map(e=>`<span class="logo-tile">${esc(e)}</span>`).join('');

  document.querySelectorAll('.decision-tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.decision-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
    if(t.dataset.tab==='manual'){$('smartBox')?.classList.add('hide');$('manualBox')?.classList.add('active')}
    else {$('smartBox')?.classList.remove('hide');$('manualBox')?.classList.remove('active')}
  }));
  document.querySelectorAll('[data-open-manual]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('[data-tab="manual"]')?.click();$('decisionCard')?.scrollIntoView({behavior:'smooth'})}));
  document.querySelectorAll('[data-quick]').forEach(c=>c.addEventListener('click',()=>{const q=$('smartQuery'); if(q){q.value=c.dataset.quick; goSmart(q.value)}}));
  function goSmart(q){if(!q?.trim())return; location.href=(location.pathname.includes('/employer/')?'../':'')+'jobs.html?q='+encodeURIComponent(q.trim())}
  $('smartGo')?.addEventListener('click',()=>goSmart($('smartQuery').value));
  $('smartQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter')goSmart(e.target.value)});
  $('manualGo')?.addEventListener('click',()=>{
    const p=new URLSearchParams(); const kw=$('manualKeyword')?.value||'', dep=$('manualDept')?.value||'', zone=$('manualZone')?.value||'';
    if(kw)p.set('q',kw);if(dep)p.set('dept',dep);if(zone)p.set('zone',zone);location.href='jobs.html?'+p;
  });

  if($('resultList')){
    const url=new URLSearchParams(location.search);
    const state={q:url.get('q')||'',dept:url.get('dept')||'',zone:url.get('zone')||'',deps:[],zones:[],levels:[],staffHouse:false,urgent:false,fresh:true,sort:'match'};
    if($('resultQuery')) $('resultQuery').value=state.q;
    document.querySelectorAll('[data-filter-dept]').forEach(cb=>{if(cb.value===state.dept)cb.checked=true});
    document.querySelectorAll('[data-filter-zone]').forEach(cb=>{if(cb.value===state.zone)cb.checked=true});
    const refresh=()=>{
      state.deps=[...document.querySelectorAll('[data-filter-dept]:checked')].map(x=>x.value);
      state.zones=[...document.querySelectorAll('[data-filter-zone]:checked')].map(x=>x.value);
      state.levels=[...document.querySelectorAll('[data-filter-level]:checked')].map(x=>x.value);
      state.staffHouse=Boolean($('filterHouse')?.checked);state.urgent=Boolean($('filterUrgent')?.checked);state.fresh=Boolean($('filterFresh')?.checked);state.sort=$('sortJobs')?.value||'match';
      const filtered=applyFilters(jobs,state);renderJobs('resultList',filtered);
      $('resultCount').textContent=filtered.length;$('toolbarCount').textContent=`${filtered.length} việc làm`;
      $('activeCount').textContent=filtered.filter(j=>j.fresh).length;$('urgentCount').textContent=filtered.filter(j=>j.urgent).length;$('staffHouseCount').textContent=filtered.filter(j=>j.staffHouse===true||(j.tags||[]).some(x=>/accommodation/i.test(x))).length;
      const intent=parseIntent(state.q); const chips=[];
      if(intent.department)chips.push(intent.department);if(intent.zone)chips.push(intent.zone);if(intent.staffHouse)chips.push('ưu tiên staff house');if(intent.urgent)chips.push('cần việc sớm');if(intent.noExperience)chips.push('chưa có kinh nghiệm');if(intent.salaryMin)chips.push(`lương từ ${intent.salaryMin} triệu`);
      $('intentSummary').innerHTML=chips.length?`Hệ thống hiểu: ${chips.map(c=>`<span class="intent-chip">${esc(c)}</span>`).join('')}`:'Bạn đang dùng tìm kiếm thủ công. Có thể chỉnh bộ lọc bên dưới bất cứ lúc nào.';
    };
    $('resultSearch')?.addEventListener('click',()=>{state.q=$('resultQuery').value;refresh()});
    $('resultQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter'){state.q=e.target.value;refresh()}});
    document.querySelectorAll('[data-filter-dept],[data-filter-zone],[data-filter-level],#filterHouse,#filterUrgent,#filterFresh,#sortJobs').forEach(el=>el?.addEventListener('change',refresh));
    $('resetAll')?.addEventListener('click',()=>{document.querySelectorAll('.filters input[type="checkbox"]').forEach(x=>x.checked=false);if($('filterFresh'))$('filterFresh').checked=true;state.q='';state.dept='';state.zone='';$('resultQuery').value='';refresh()});
    refresh();
  }

  if($('jobDetail')){
    const id=new URLSearchParams(location.search).get('id')||jobs[0]?.id; const j=jobs.find(x=>x.id===id)||jobs[0];
    if(j){
      document.title=`${j.title} - ${j.employer} | PhuQuocCareers`;
      $('detailTitle').textContent=j.title;$('crumbTitle').textContent=j.title;$('detailEmployer').textContent=j.employer;$('detailLocation').textContent=j.location;$('detailDesc').textContent=j.description;$('heroCompanyMark').textContent=companyInitials(j.employer);$('companyMiniMark').textContent=companyInitials(j.employer);$('companyMiniName').textContent=j.employer;
      $('heroBenefits').innerHTML=benefitTags(j).map(t=>`<span class="tag">${esc(t.text)}</span>`).join('')+(j.salary?`<span class="tag">${esc(j.salary)}</span>`:'<span class="tag">Lương chưa công khai</span>');
      const fields=[['Bộ phận',j.department],['Khu vực',j.zone],['Kinh nghiệm',j.experience],['Tiếng Anh',j.english],['Lương',j.salary||'Chưa công khai'],['Service charge',j.serviceCharge===true?'Có':j.serviceCharge===false?'Không':'Chưa xác nhận'],['Staff house',j.staffHouse===true?'Có':j.staffHouse===false?'Không':'Chưa xác nhận'],['Ngày nghỉ',j.offDays||'Chưa xác nhận']];
      $('factGrid').innerHTML=fields.map(([a,b])=>`<div class="fact"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
      const highlights=[`Vị trí thuộc bộ phận ${j.department}.`,`Địa điểm làm việc: ${j.location}.`,`Loại hình: ${j.employment}.`];
      $('detailHighlights').innerHTML=highlights.map(x=>`<div>${esc(x)}</div>`).join('');
      $('requirementList').innerHTML=[j.experience?`Kinh nghiệm: ${j.experience}.`:null,j.english?`Tiếng Anh: ${j.english}.`:null,'Các yêu cầu khác: xem nguồn tuyển dụng chính thức.'].filter(Boolean).map(x=>`<div>${esc(x)}</div>`).join('');
      const ben=[['Staff house',j.staffHouse===true?'Có':j.staffHouse===false?'Không':'Chưa xác nhận'],['Service charge',j.serviceCharge===true?'Có':j.serviceCharge===false?'Không':'Chưa xác nhận'],['Bữa ăn',j.meals?`${j.meals} bữa/ngày`:'Chưa xác nhận'],['Shuttle',j.shuttle===true?'Có':j.shuttle===false?'Không':'Chưa xác nhận'],['Ngày nghỉ',j.offDays||'Chưa xác nhận'],['Mức lương',j.salary||'Chưa công khai']];
      $('benefitDetail').innerHTML=ben.map(([a,b])=>`<div class="benefit-detail"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
      $('sourceType').textContent=j.sourceType;$('sourceChecked').textContent=j.lastChecked;$('sourceLink').href=j.sourceUrl;
      $('interestBtn')?.addEventListener('click',()=>openModal('interestModal'));$('applyBtn')?.addEventListener('click',()=>openModal('applyModal'));
      let chosenIntent='';document.querySelectorAll('.intent-option').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.intent-option').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');chosenIntent=btn.dataset.intent}));
      $('saveIntentBtn')?.addEventListener('click',()=>{if(!chosenIntent){alert('Chọn một trạng thái trước nhé.');return}localStorage.setItem('pqc-intent',JSON.stringify({intent:chosenIntent,job:j.id,confirmedAt:new Date().toISOString()}));window.PQC_closeModal('interestModal');$('interestBtn').textContent='✓ Đã ghi nhận mức quan tâm'});
      $('saveJobBtn')?.addEventListener('click',()=>{const saved=JSON.parse(localStorage.getItem('pqc-saved')||'[]');if(!saved.includes(j.id))saved.push(j.id);localStorage.setItem('pqc-saved',JSON.stringify(saved));$('saveJobBtn').textContent='♥ Đã lưu'});
      $('submitApplyBtn')?.addEventListener('click',()=>{if(!$('applyName').value.trim()||!$('applyPhone').value.trim()){alert('Cho HR biết tên và số điện thoại/Zalo trước nhé.');return}if(!$('applyConsent').checked){alert('Bạn cần đồng ý gửi thông tin cho nhà tuyển dụng của vị trí này.');return}localStorage.setItem('pqc-light-profile',JSON.stringify({name:$('applyName').value.trim(),phone:$('applyPhone').value.trim(),job:j.id,interview:$('applyInterview').value,start:$('applyStart').value,createdAt:new Date().toISOString()}));$('applySuccess').classList.add('show');$('submitApplyBtn').disabled=true;$('submitApplyBtn').textContent='Đã gửi'});
    }
  }

  if($('employerDirectory')){
    const map={};jobs.forEach(j=>{map[j.employer]??={name:j.employer,operator:j.operator,jobs:[],fresh:0};map[j.employer].jobs.push(j);if(j.fresh)map[j.employer].fresh++});
    $('employerDirectory').innerHTML=Object.values(map).map(e=>`<article class="employer-directory-card"><div class="employer-directory-head"><div class="employer-directory-mark">${esc(companyInitials(e.name))}</div><div><h3>${esc(e.name)}</h3><p>${esc(e.operator||'Phú Quốc')}</p></div></div><div class="employer-directory-stats"><span>${e.jobs.length} vị trí</span><span>${e.fresh} nguồn fresh</span></div><a class="text-link" href="jobs.html?q=${encodeURIComponent(e.name)}">Xem việc đang có →</a></article>`).join('');
  }

  document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>{const parent=b.closest('.choice-row');parent?.querySelectorAll('.choice').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));
  $('careerSuggestBtn')?.addEventListener('click',()=>{$('careerSuggestions')?.scrollIntoView({behavior:'smooth',block:'start'})});

  let postMode='text';
  document.querySelectorAll('[data-post-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-post-mode]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');postMode=btn.dataset.postMode;
    document.querySelectorAll('.post-mode').forEach(x=>x.classList.remove('active'));const map={text:'postTextMode',poster:'postPosterMode',url:'postUrlMode'};$(map[postMode])?.classList.add('active');
  }));
  $('posterInput')?.addEventListener('change',e=>{$('posterFileName').textContent=e.target.files?.[0]?`Đã chọn: ${e.target.files[0].name}`:''});
  function parseJD(text){
    const lower=text.toLowerCase();
    const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);
    const title=(lines.find(x=>x.length>3&&x.length<95)||'Vị trí tuyển dụng').replace(/^[-•*\d.\s]+/,'');
    const dept=lower.includes('human resources')||lower.includes('nhân sự')||lower.includes('people & culture')?'Nhân sự':lower.includes('food')||lower.includes('f&b')||lower.includes('restaurant')||lower.includes('phục vụ')?'F&B':lower.includes('housekeeping')||lower.includes('buồng phòng')?'Housekeeping':lower.includes('front office')||lower.includes('lễ tân')?'Front Office':lower.includes('reservation')||lower.includes('đặt phòng')?'Reservations':lower.includes('spa')||lower.includes('wellness')?'Spa & Wellness':'Chưa xác định';
    const exp=(text.match(/(?:at least|tối thiểu|từ)\s*(\d+)\s*(?:year|years|năm)/i)||[])[1];
    const salary=text.match(/(\d{1,2}(?:[.,]\d+)?)\s*(?:-|–|to|đến)\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:triệu|million)/i);
    const off=(text.match(/(\d+)\s*(?:ngày\s*)?(?:off|nghỉ)(?:\/tháng)?/i)||[])[1];
    const employer=(lines.find(x=>/(phu quoc|phú quốc|moxy|marriott|rixos|novotel|hotel|resort)/i.test(x) && x!==title)||'Nhà tuyển dụng của bạn').slice(0,70);
    return {title,dept,exp:exp?`Từ ${exp} năm`:'Chưa rõ',salary:salary?`${salary[1]} - ${salary[2]} triệu`:'Chưa công khai',house:/(staff house|accommodation|nhà ở|chỗ ở|lưu trú)/i.test(text)?'Có đề cập':'Chưa xác nhận',sc:/(service charge|phí phục vụ)/i.test(text)?'Có đề cập':'Chưa xác nhận',off:off?`${off} ngày/tháng`:'Chưa xác nhận',employer};
  }
  $('parseBtn')?.addEventListener('click',()=>{
    let text='';
    if(postMode==='text') text=$('jdText')?.value.trim()||'';
    if(postMode==='url') {const url=$('jobUrlInput')?.value.trim()||'';if(!url){alert('Dán link tuyển dụng trước nhé.');return}text=`Vị trí tuyển dụng\nNguồn chính thức: ${url}`;}
    if(postMode==='poster') {const file=$('posterInput')?.files?.[0];if(!file){alert('Chọn poster hoặc PDF trước nhé.');return}text=file.name.replace(/[_-]/g,' ')+'\nPoster tuyển dụng';}
    if(!text){alert('Dán JD hoặc nội dung tuyển dụng trước nhé.');return}
    const r=parseJD(text);const map={parseTitle:r.title,parseDept:r.dept,parseExp:r.exp,parseSalary:r.salary,parseHouse:r.house,parseSC:r.sc,parseOff:r.off,previewEmployer:r.employer,parseDeptMini:r.dept,parseSalaryTag:r.salary,parseHouseTag:`Staff house: ${r.house}`};
    Object.entries(map).forEach(([id,v])=>{if($(id))$(id).textContent=v});$('parseResult')?.classList.add('show');$('parseResult')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('editParseBtn')?.addEventListener('click',()=>{$('parseResult')?.classList.remove('show');$('jdText')?.focus()});
  $('confirmParseBtn')?.addEventListener('click',()=>openModal('hrLoginModal'));
})();