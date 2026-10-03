(function(){
  const $=id=>document.getElementById(id);const token=localStorage.getItem('pqc-hr-session');
  const labels={submitted:'Mới gửi',viewed:'Đã xem',shortlisted:'Shortlist',interview:'Phỏng vấn',offer:'Offer',joined:'Đã nhận việc',rejected:'Không tiếp tục',withdrawn:'Ứng viên đã rút'};
  const order=['submitted','viewed','shortlisted','interview','offer','joined'];
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let currentJob=null,currentCandidates=[],candidateFilter='action';
  async function api(path,opts={}){const headers={accept:'application/json',...(opts.headers||{})};if(token)headers.authorization=`Bearer ${token}`;const res=await fetch(path,{...opts,headers});let data=null;try{data=await res.json()}catch{}return {res,data}}
  function lock(){localStorage.removeItem('pqc-hr-session');$('hrLocked')?.classList.remove('hide');$('hrWorkspace')?.classList.add('hide');$('hrLogout')?.classList.add('hide')}
  function nextStatuses(current){if(['joined','rejected','withdrawn'].includes(current))return[];const i=order.indexOf(current);return [...order.slice(i+1),'rejected']}
  function fmt(v){if(!v)return '';try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return v}}
  function filterItems(items,filter){if(filter==='all')return items;if(filter==='action')return items.filter(x=>['submitted','viewed'].includes(x.status));if(filter==='closed')return items.filter(x=>['rejected','withdrawn'].includes(x.status));return items.filter(x=>x.status===filter)}
  function count(items,statuses){return items.filter(x=>statuses.includes(x.status)).length}

  async function publishDraft(draftId,button){
    button.disabled=true;button.textContent='Đang publish...';
    const out=await api(`/api/hr/job-drafts/${encodeURIComponent(draftId)}/publish`,{method:'POST'});
    if(out.res.status===401)return lock();
    if(out.res.ok){button.textContent='Đã publish';await loadWorkData();return}
    const msg=out.data?.error==='parser_incomplete'?'Nội dung này chưa được parser production đọc đầy đủ. Chưa thể publish.':out.data?.error==='forbidden'?'Tài khoản này không có quyền publish draft của property đó.':`Chưa publish được: ${out.data?.error||'backend error'}.`;
    alert(msg);button.disabled=false;button.textContent='Publish';
  }

  function renderDrafts(items){
    if(!$('hrDrafts'))return;$('hrDraftCount').textContent=items.filter(d=>d.status!=='published').length;
    $('hrDrafts').innerHTML=items.length?items.map(d=>{
      const published=d.status==='published'&&d.published_job_id;
      const blocked=d.parser_status==='needs_parser';
      const action=published?`<a class="btn btn-ghost" href="../job.html?id=${encodeURIComponent(d.published_job_id)}">Xem job →</a>`:blocked?'<span class="tag warn">Cần parser</span>':`<button class="btn btn-primary" data-publish-draft="${esc(d.id)}">Publish</button>`;
      return `<article class="hr-draft"><div><span class="mini-label">${esc(d.employer_name)}</span><h4>${esc(d.title)}</h4><p>${esc(d.department||'Chưa xác định')} · ${esc(d.input_type)} · ${esc(d.parser_status)}</p></div><div class="benefits"><span class="tag">${esc(d.status)}</span>${d.salary_text?`<span class="tag alt">${esc(d.salary_text)}</span>`:''}</div><div class="hr-draft-action">${action}</div></article>`;
    }).join(''):'<div class="empty-state"><strong>Chưa có draft.</strong><span>Parse JD rồi lưu, draft sẽ xuất hiện ở đây trước khi publish.</span></div>';
    document.querySelectorAll('[data-publish-draft]').forEach(btn=>btn.addEventListener('click',()=>publishDraft(btn.dataset.publishDraft,btn)));
  }

  function renderPipeline(items){
    const el=$('hrCandidatePipeline');if(!el)return;
    const defs=[['action','Cần xử lý',count(items,['submitted','viewed'])],['shortlisted','Shortlist',count(items,['shortlisted'])],['interview','Phỏng vấn',count(items,['interview'])],['offer','Offer',count(items,['offer'])],['joined','Đã nhận việc',count(items,['joined'])],['closed','Đã đóng',count(items,['rejected','withdrawn'])],['all','Tất cả',items.length]];
    el.innerHTML=defs.map(([key,label,n])=>`<button class="hr-stage ${candidateFilter===key?'active':''}" data-candidate-filter="${key}"><span>${esc(label)}</span><strong>${n}</strong></button>`).join('');
    el.querySelectorAll('[data-candidate-filter]').forEach(btn=>btn.addEventListener('click',()=>{candidateFilter=btn.dataset.candidateFilter;renderCandidates()}));
  }

  function renderCandidates(){
    renderPipeline(currentCandidates);const items=filterItems(currentCandidates,candidateFilter);$('hrCandidateCount').textContent=`${items.length}/${currentCandidates.length}`;
    $('hrCandidates').innerHTML=items.length?items.map(c=>{
      const options=nextStatuses(c.status);const attention=['submitted','viewed'].includes(c.status);
      return `<article class="hr-candidate ${attention?'needs-action':''}" data-app-id="${esc(c.id)}" data-status="${esc(c.status)}"><div><div class="hr-candidate-titleline"><h4>${esc(c.name||'Ứng viên')}</h4><span class="hr-stage-label status-${esc(c.status)}">${esc(labels[c.status]||c.status)}</span></div><div class="hr-candidate-meta"><span>Nguồn: ${esc(c.sourceChannel||'direct')}</span><span>Gửi ${esc(fmt(c.submittedAt))}</span></div><div class="hr-candidate-contact">${esc(c.phone||'')}</div>${c.interviewPreference?`<div class="hr-inline-msg">Muốn phỏng vấn: ${esc(c.interviewPreference)}</div>`:''}${c.availableDate?`<div class="hr-inline-msg">Có thể nhận việc: ${esc(c.availableDate)}</div>`:''}</div><div class="hr-candidate-actions">${options.length?`<label class="hr-next-label">Bước tiếp theo<select data-next-status>${options.map(s=>`<option value="${s}">${esc(labels[s])}</option>`).join('')}</select></label><button class="btn btn-primary" data-update-status>Cập nhật</button>`:`<span class="tag">${esc(labels[c.status]||c.status)}</span>`}</div></article>`}).join(''):`<div class="empty-state"><strong>Không có ứng viên ở bước này.</strong><span>Chuyển sang nhóm khác hoặc chờ application mới.</span></div>`;
    document.querySelectorAll('[data-update-status]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('[data-app-id]');const next=row.querySelector('[data-next-status]')?.value;if(!next)return;btn.disabled=true;btn.textContent='Đang cập nhật...';const out=await api(`/api/hr/applications/${encodeURIComponent(row.dataset.appId)}/status`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:next})});if(out.res.ok&&currentJob)await loadCandidates(currentJob);else{alert(out.data?.error==='invalid_transition'?'Trạng thái này không thể chuyển theo hướng đó.':'Chưa cập nhật được trạng thái.');btn.disabled=false;btn.textContent='Cập nhật'}}));
  }

  async function loadCandidates(job){
    currentJob=job;candidateFilter='action';$('hrCandidateEmpty')?.classList.add('hide');$('hrCandidateView')?.classList.remove('hide');$('hrCandidateTitle').textContent=job.title;$('hrCandidates').innerHTML='<div class="empty-state"><strong>Đang tải ứng viên...</strong></div>';
    const {res,data}=await api(`/api/hr/jobs/${encodeURIComponent(job.id)}/applications`);if(res.status===401)return lock();if(!res.ok){$('hrCandidates').innerHTML='<div class="empty-state"><strong>Không mở được candidate data.</strong><span>Session hoặc membership không đủ quyền.</span></div>';return}
    currentCandidates=data.items||[];renderCandidates();
  }

  async function loadWorkData(){
    const [jobs,drafts]=await Promise.all([api('/api/hr/jobs'),api('/api/hr/job-drafts')]);if(!jobs.res.ok)return lock();if(drafts.res.ok)renderDrafts(drafts.data.items||[]);
    $('hrJobCount').textContent=jobs.data.items.length;$('hrJobs').innerHTML=jobs.data.items.length?jobs.data.items.map(j=>`<button class="hr-job-button" data-job-id="${esc(j.id)}"><strong>${esc(j.title)}</strong><span>${esc(j.employer_name)} · ${esc(j.location||'Phú Quốc')} · ${esc(j.membership_role)}</span></button>`).join(''):'<div class="empty-state"><strong>Chưa có job active.</strong></div>';
    document.querySelectorAll('[data-job-id]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-job-id]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const job=jobs.data.items.find(x=>x.id===btn.dataset.jobId);if(job)loadCandidates(job)}));
  }

  async function init(){
    if(!token)return lock();const me=await api('/api/hr/me');if(!me.res.ok)return lock();$('hrLocked')?.classList.add('hide');$('hrWorkspace')?.classList.remove('hide');$('hrLogout')?.classList.remove('hide');
    $('hrMemberships').innerHTML=(me.data.employers||[]).map(e=>`<span class="tag">${esc(e.employer_name)} · ${esc(e.role)}</span>`).join('');await loadWorkData();
  }
  $('hrLogout')?.addEventListener('click',()=>{localStorage.removeItem('pqc-hr-session');location.reload()});init();
})();