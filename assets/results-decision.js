(function(){
  const list=document.getElementById('resultList');
  if(!list)return;
  const jobs=window.PQC_JOBS||[];
  const byId=new Map(jobs.map(j=>[String(j.id),j]));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  if(!document.querySelector('link[data-pqc-results-decision]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='assets/results-decision.css';link.dataset.pqcResultsDecision='1';document.head.appendChild(link);
  }

  function injectFilters(){
    const foot=document.querySelector('.filter-foot');
    if(!foot||document.getElementById('filterServiceCharge'))return;
    const group=document.createElement('div');group.className='filter-group pqc-local-benefits';
    group.innerHTML='<strong>Điều kiện sống ở Phú Quốc</strong>'+
      '<label class="check"><input id="filterServiceCharge" type="checkbox"> Có service charge</label>'+
      '<label class="check"><input id="filterShuttle" type="checkbox"> Có shuttle / xe đưa đón</label>'+
      '<label class="check"><input id="filterMeals" type="checkbox"> Có bữa ăn nhân viên</label>'+
      '<label class="check"><input id="filterSalaryPublic" type="checkbox"> Có công khai lương</label>';
    foot.parentNode.insertBefore(group,foot);
    group.querySelectorAll('input').forEach(el=>el.addEventListener('change',enhance));
  }

  function parseNeed(text=''){
    const t=text.toLowerCase();const n={raw:text};
    const deps=[
      ['F&B',['phục vụ','f&b','nhà hàng','restaurant','bartender','bar','ẩm thực']],
      ['Front Office',['lễ tân','front office','reception','guest service']],
      ['Housekeeping',['buồng phòng','housekeeping','room attendant']],
      ['Nhân sự',['nhân sự','hr','human resources','people & culture']],
      ['Reservations',['đặt phòng','reservation']],
      ['Spa & Wellness',['spa','wellness']],
      ['Giải trí',['giải trí','recreation','hoạt động biển','fitness']]
    ];
    for(const [department,keys] of deps){if(keys.some(k=>t.includes(k))){n.department=department;break}}
    if(t.includes('dương đông'))n.zone='Dương Đông';
    else if(t.includes('bãi trường'))n.zone='Bãi Trường';
    else if(/nam đảo|an thới|hòn thơm/.test(t))n.zone='Nam đảo';
    else if(/bắc đảo|gành dầu|bãi dài/.test(t))n.zone='Bắc đảo';
    n.staffHouse=/staff house|chỗ ở|nhà ở|lưu trú/.test(t);
    n.serviceCharge=/service charge|phí phục vụ/.test(t);
    n.shuttle=/shuttle|xe đưa đón|đưa rước/.test(t);
    n.meals=/bữa ăn|cơm ca|ăn ca|suất ăn/.test(t);
    n.urgent=/cần việc ngay|cần việc sớm|tuyển gấp|đi làm ngay|việc ngay/.test(t);
    n.noExperience=/không cần kinh nghiệm|chưa có kinh nghiệm|mới ra trường/.test(t);
    const salary=t.match(/(?:lương\s*)?(?:từ\s*)?(\d{1,2})(?:\s*(?:-|đến|tới)\s*(\d{1,2}))?\s*triệu/);
    if(salary)n.salaryMin=Number(salary[1]);
    return n;
  }

  function salaryNumber(text){const m=String(text||'').match(/(\d{1,2}(?:[.,]\d+)?)/);return m?Number(m[1].replace(',','.')):null}
  function hasAccommodation(j){return j.staffHouse===true||(j.tags||[]).some(x=>/accommodation|staff house|lưu trú|chỗ ở/i.test(x))}
  function hasService(j){return j.serviceCharge===true||(j.tags||[]).some(x=>/service charge|phí phục vụ/i.test(x))}
  function hasShuttle(j){return j.shuttle===true||(j.tags||[]).some(x=>/shuttle|đưa đón|đưa rước/i.test(x))}
  function hasMeals(j){return Boolean(j.meals)||(j.tags||[]).some(x=>/meal|bữa|ăn ca|cơm ca/i.test(x))}

  function score(j,n){
    let s=0;const why=[];const gaps=[];
    if(n.department){if(j.department===n.department){s+=5;why.push(`Đúng nhóm ${n.department}`)}else gaps.push(`Khác nhóm ${n.department}`)}
    if(n.zone){if(j.zone===n.zone||String(j.location||'').includes(n.zone)){s+=4;why.push(`Đúng khu ${n.zone}`)}else gaps.push(`Không ở ${n.zone}`)}
    if(n.staffHouse){if(hasAccommodation(j)){s+=4;why.push('Có hỗ trợ lưu trú')}else if(j.staffHouse==null)gaps.push('Staff house chưa xác nhận');else gaps.push('Không có staff house')}
    if(n.serviceCharge){if(hasService(j)){s+=3;why.push('Có service charge')}else gaps.push('Service charge chưa rõ')}
    if(n.shuttle){if(hasShuttle(j)){s+=3;why.push('Có shuttle')}else gaps.push('Shuttle chưa rõ')}
    if(n.meals){if(hasMeals(j)){s+=2;why.push('Có bữa ăn')}else gaps.push('Bữa ăn chưa rõ')}
    if(n.urgent&&j.urgent){s+=2;why.push('Đang tuyển gấp')}
    if(n.noExperience&&/entry|associate|intern|trainee|không yêu cầu/i.test(`${j.experience||''} ${(j.tags||[]).join(' ')}`)){s+=3;why.push('Hợp người ít kinh nghiệm')}
    if(n.salaryMin){const v=salaryNumber(j.salary);if(v!=null&&v>=n.salaryMin){s+=3;why.push(`Lương công khai từ ${v} triệu`)}else if(v==null)gaps.push('Lương chưa công khai');else gaps.push(`Lương công khai dưới ${n.salaryMin} triệu`)}
    if(j.fresh){s+=1;why.push('Nguồn còn fresh')}
    if(j.verifiedByEmployer){s+=1;why.push('Employer đã xác nhận')}
    return {score:s,why:[...new Set(why)].slice(0,4),gaps:[...new Set(gaps)].slice(0,2)};
  }

  function extraFilterPass(j){
    if(document.getElementById('filterServiceCharge')?.checked&&!hasService(j))return false;
    if(document.getElementById('filterShuttle')?.checked&&!hasShuttle(j))return false;
    if(document.getElementById('filterMeals')?.checked&&!hasMeals(j))return false;
    if(document.getElementById('filterSalaryPublic')?.checked&&!j.salary)return false;
    return true;
  }

  let observer;
  function enhance(){
    if(!list.isConnected)return;
    observer?.disconnect();
    const rawNeed=(document.getElementById('resultQuery')?.value||new URLSearchParams(location.search).get('q')||'').trim().slice(0,240);
    const need=parseNeed(rawNeed);
    const cards=[...list.querySelectorAll('.job-card')];
    const ranked=[];
    for(const card of cards){
      const href=card.getAttribute('href')||'';let jobId='';try{jobId=new URL(href,location.href).searchParams.get('id')||''}catch{}
      const job=byId.get(jobId);if(!job)continue;
      if(rawNeed)card.setAttribute('href',`job.html?id=${encodeURIComponent(jobId)}&need=${encodeURIComponent(rawNeed)}`);
      else card.setAttribute('href',`job.html?id=${encodeURIComponent(jobId)}`);
      const fit=score(job,need);card.dataset.matchScore=String(fit.score);
      card.classList.toggle('pqc-extra-hidden',!extraFilterPass(job));
      card.querySelector('.pqc-match')?.remove();
      const body=card.querySelector('.job-card-body');
      if(body&&(fit.why.length||fit.gaps.length)){
        const box=document.createElement('div');box.className='pqc-match';
        box.innerHTML=`<div class="pqc-match-title">Vì sao job này đáng xem</div><div class="pqc-match-row">${fit.why.map(x=>`<span class="pqc-match-good">✓ ${esc(x)}</span>`).join('')}${fit.gaps.map(x=>`<span class="pqc-match-gap">? ${esc(x)}</span>`).join('')}</div>`;
        body.appendChild(box);
      }
      ranked.push({card,score:fit.score});
    }
    if((document.getElementById('sortJobs')?.value||'match')==='match')ranked.sort((a,b)=>b.score-a.score).forEach(x=>list.appendChild(x.card));
    const visible=ranked.filter(x=>!x.card.classList.contains('pqc-extra-hidden')).length;
    const resultCount=document.getElementById('resultCount'),toolbar=document.getElementById('toolbarCount');
    if(resultCount)resultCount.textContent=String(visible);if(toolbar)toolbar.textContent=`${visible} việc làm`;
    observer?.observe(list,{childList:true});
  }

  injectFilters();
  observer=new MutationObserver(()=>queueMicrotask(enhance));observer.observe(list,{childList:true});
  document.getElementById('resetAll')?.addEventListener('click',()=>setTimeout(enhance,0));
  document.getElementById('sortJobs')?.addEventListener('change',()=>setTimeout(enhance,0));
  document.getElementById('resultSearch')?.addEventListener('click',()=>setTimeout(enhance,0));
  document.getElementById('resultQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter')setTimeout(enhance,0)});
  setTimeout(enhance,0);
})();