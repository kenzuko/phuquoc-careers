(function(){
  const $=id=>document.getElementById(id);const token=localStorage.getItem('pqc-hr-session');
  const labels={submitted:'Đã gửi',viewed:'Đã xem',shortlisted:'Shortlist',interview:'Phỏng vấn',offer:'Offer',joined:'Đã nhận việc',rejected:'Không tiếp tục',withdrawn:'Ứng viên đã rút'};
  const order=['submitted','viewed','shortlisted','interview','offer','joined'];
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  async function api(path,opts={}){const headers={accept:'application/json',...(opts.headers||{})};if(token)headers.authorization=`Bearer ${token}`;const res=await fetch(path,{...opts,headers});let data=null;try{data=await res.json()}catch{}return {res,data}}
  function lock(){localStorage.removeItem('pqc-hr-session');$('hrLocked')?.classList.remove('hide');$('hrWorkspace')?.classList.add('hide');$('hrLogout')?.classList.add('hide')}
  function nextStatuses(current){if(['joined','rejected','withdrawn'].includes(current))return[];const i=order.indexOf(current);return [...order.slice(i+1),'rejected']}
  function fmt(v){if(!v)return '';try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return v}}
  async function loadCandidates(job){
    $('hrCandidateEmpty')?.classList.add('hide');$('hrCandidateView')?.classList.remove('hide');$('hrCandidateTitle').textContent=job.title;$('hrCandidates').innerHTML='<div class="empty-state"><strong>Đang tải ứng viên...</strong></div>';
    const {res,data}=await api(`/api/hr/jobs/${encodeURIComponent(job.id)}/applications`);if(res.status===401)return lock();if(!res.ok){$('hrCandidates').innerHTML='<div class="empty-state"><strong>Không mở được candidate data.</strong><span>Session hoặc membership không đủ quyền.</span></div>';return}
    $('hrCandidateCount').textContent=data.items.length;
    $('hrCandidates').innerHTML=data.items.length?data.items.map(c=>{
      const options=nextStatuses(c.status);return `<article class="hr-candidate" data-app-id="${esc(c.id)}"><div><h4>${esc(c.name||'Ứng viên')}</h4><div class="hr-candidate-meta"><span>${esc(labels[c.status]||c.status)}</span><span>Nguồn: ${esc(c.sourceChannel||'direct')}</span><span>${esc(fmt(c.submittedAt))}</span></div><div class="hr-candidate-contact">${esc(c.phone||'')}</div>${c.interviewPreference?`<div class="hr-inline-msg">Mong muốn phỏng vấn: ${esc(c.interviewPreference)}</div>`:''}${c.availableDate?`<div class="hr-inline-msg">Có thể bắt đầu: ${esc(c.availableDate)}</div>`:''}</div><div class="hr-candidate-actions">${options.length?`<select data-next-status>${options.map(s=>`<option value="${s}">${esc(labels[s])}</option>`).join('')}</select><button class="btn btn-ghost" data-update-status>Cập nhật</button>`:`<span class="tag">${esc(labels[c.status]||c.status)}</span>`}</div></article>`}).join(''):'<div class="empty-state"><strong>Chưa có ứng viên.</strong><span>Job này chưa nhận application qua PhuQuocCareers.</span></div>';
    document.querySelectorAll('[data-update-status]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('[data-app-id]');const next=row.querySelector('[data-next-status]')?.value;if(!next)return;btn.disabled=true;btn.textContent='Đang cập nhật...';const out=await api(`/api/hr/applications/${encodeURIComponent(row.dataset.appId)}/status`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:next})});if(out.res.ok)await loadCandidates(job);else{alert(out.data?.error==='invalid_transition'?'Trạng thái này không thể chuyển theo hướng đó.':'Chưa cập nhật được trạng thái.');btn.disabled=false;btn.textContent='Cập nhật'}}));
  }
  async function init(){
    if(!token)return lock();const me=await api('/api/hr/me');if(!me.res.ok)return lock();$('hrLocked')?.classList.add('hide');$('hrWorkspace')?.classList.remove('hide');$('hrLogout')?.classList.remove('hide');
    $('hrMemberships').innerHTML=(me.data.employers||[]).map(e=>`<span class="tag">${esc(e.employer_name)} · ${esc(e.role)}</span>`).join('');
    const jobs=await api('/api/hr/jobs');if(!jobs.res.ok)return lock();$('hrJobCount').textContent=jobs.data.items.length;$('hrJobs').innerHTML=jobs.data.items.length?jobs.data.items.map(j=>`<button class="hr-job-button" data-job-id="${esc(j.id)}"><strong>${esc(j.title)}</strong><span>${esc(j.employer_name)} · ${esc(j.location||'Phú Quốc')} · ${esc(j.membership_role)}</span></button>`).join(''):'<div class="empty-state"><strong>Chưa có job active.</strong></div>';
    document.querySelectorAll('[data-job-id]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-job-id]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const job=jobs.data.items.find(x=>x.id===btn.dataset.jobId);if(job)loadCandidates(job)}));
  }
  $('hrLogout')?.addEventListener('click',()=>{localStorage.removeItem('pqc-hr-session');location.reload()});init();
})();
