(function(){
  const $=id=>document.getElementById(id);
  const disabledText='Tính năng này chưa mở trong giai đoạn hiện tại.';
  async function readiness(){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),2500);
    try{const res=await fetch('/api/readiness',{headers:{accept:'application/json'},signal:controller.signal,cache:'no-store'});if(!res.ok)return null;return await res.json()}catch{return null}finally{clearTimeout(timer)}
  }
  function disableButton(el,label){if(!el)return;el.disabled=true;el.setAttribute('aria-disabled','true');if(label)el.textContent=label}
  function candidateClosed(){
    disableButton($('interestBtn'),'Quan tâm - sắp mở');
    disableButton($('applyBtn'),'Ứng tuyển - sắp mở');
    const card=document.querySelector('.apply-card');
    if(card&&!card.querySelector('[data-launch-note]')){const note=document.createElement('div');note.dataset.launchNote='candidate';note.className='truth-note';note.innerHTML='<span>i</span><div><strong>Đang ở chế độ chỉ xem việc.</strong><p>PhuQuocCareers chưa nhận thông tin ứng tuyển ở giai đoạn này.</p></div>';card.appendChild(note)}
  }
  function claimClosed(){
    disableButton($('claimSubmit'),'Claim - sắp mở');
    const box=$('claimResult');if(box){box.textContent=disabledText;box.classList.add('show')}
  }
  readiness().then(data=>{
    if(!data?.ok||!data.launch)return;
    window.PQC_LAUNCH_STATE=data.launch;
    if(data.launch.candidateWrites===false)candidateClosed();
    if(data.launch.employerClaims===false)claimClosed();
  });
})();
