(function(){
  const $=id=>document.getElementById(id);if(!$('confirmParseBtn'))return;
  let pendingPayload=null;
  const token=()=>localStorage.getItem('pqc-hr-session');
  async function api(path,opts={}){const t=token();const headers={accept:'application/json',...(opts.headers||{})};if(t)headers.authorization=`Bearer ${t}`;const res=await fetch(path,{...opts,headers});let data=null;try{data=await res.json()}catch{}return {res,data}}
  function open(id){$(id)?.classList.add('show')}
  function close(id){window.PQC_closeModal?.(id)}
  function parsedPayload(){
    const mode=document.querySelector('[data-post-mode].active')?.dataset.postMode||'text';
    const text=$('jdText')?.value.trim()||'';const sourceUrl=$('jobUrlInput')?.value.trim()||null;const file=$('posterInput')?.files?.[0];
    const house=($('parseHouse')?.textContent||'').toLowerCase();const sc=($('parseSC')?.textContent||'').toLowerCase();
    return {inputType:mode,sourceUrl:mode==='url'?sourceUrl:null,uploadName:mode==='poster'?(file?.name||null):null,rawText:mode==='text'?text:null,parsed:{title:$('parseTitle')?.textContent||'',department:$('parseDept')?.textContent||null,experience:$('parseExp')?.textContent||null,salary:$('parseSalary')?.textContent||null,staffHouseState:house.includes('có đề cập')?'mentioned':'unknown',serviceChargeState:sc.includes('có đề cập')?'mentioned':'unknown',offDays:$('parseOff')?.textContent||null}};
  }
  async function save(employerId){
    const btn=$('confirmParseBtn');btn.disabled=true;btn.textContent='Đang lưu draft...';
    const out=await api('/api/hr/job-drafts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...pendingPayload,employerId})});
    const box=$('draftSaved');box.classList.add('show');
    if(out.res.ok){box.textContent=`✓ Đã lưu draft ${out.data.draftId}. Chưa publish ra public cho tới khi HR xác nhận đầy đủ.`;btn.textContent='Đã lưu draft';localStorage.setItem('pqc-last-hr-draft',out.data.draftId);close('draftEmployerModal')}
    else if(out.res.status===401){localStorage.removeItem('pqc-hr-session');box.textContent='Session HR đã hết hạn. Draft chưa được gửi.';btn.disabled=false;btn.textContent='Xác nhận & tiếp tục →';open('hrLoginModal')}
    else {box.textContent=`Chưa lưu được draft: ${out.data?.error||'backend error'}.`;btn.disabled=false;btn.textContent='Thử lưu lại'}
  }
  $('confirmParseBtn').addEventListener('click',async e=>{
    e.preventDefault();e.stopImmediatePropagation();pendingPayload=parsedPayload();
    if(!token()){open('hrLoginModal');return}
    const me=await api('/api/hr/me');if(!me.res.ok){localStorage.removeItem('pqc-hr-session');open('hrLoginModal');return}
    const memberships=me.data?.employers||[];if(!memberships.length){open('hrLoginModal');return}
    if(memberships.length===1){await save(memberships[0].employer_id);return}
    $('draftEmployerSelect').innerHTML=memberships.map(m=>`<option value="${m.employer_id}">${m.employer_name} · ${m.role}</option>`).join('');open('draftEmployerModal');
  },true);
  $('saveDraftEmployerBtn')?.addEventListener('click',()=>{const employerId=$('draftEmployerSelect')?.value;if(employerId)save(employerId)});
})();
