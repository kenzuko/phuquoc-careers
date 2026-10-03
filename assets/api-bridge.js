(function(){
  const $=id=>document.getElementById(id);
  const jobId=new URLSearchParams(location.search).get('id');
  if(!jobId||!$('jobDetail')) return;

  async function post(path,payload){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    try{
      const res=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      let data=null;try{data=await res.json()}catch{}
      return {ok:res.ok,status:res.status,data};
    }catch{return null}finally{clearTimeout(timer)}
  }
  function sourceChannel(){
    const cached=sessionStorage.getItem('pqc-source-channel');if(cached)return cached;
    const params=new URLSearchParams(location.search);const raw=(params.get('utm_source')||params.get('src')||'').toLowerCase();
    const ref=(document.referrer||'').toLowerCase();const text=raw+' '+ref;
    const channel=text.includes('facebook')||text.includes('fb.')?'facebook':text.includes('zalo')?'zalo':text.includes('google')?'google':ref?'referral':'direct';
    sessionStorage.setItem('pqc-source-channel',channel);return channel;
  }
  function guestId(){return localStorage.getItem('pqc-guest-id')||undefined}
  function saveGuest(data){if(data?.guestId)localStorage.setItem('pqc-guest-id',data.guestId)}
  function close(id){window.PQC_closeModal?.(id)}

  $('saveIntentBtn')?.addEventListener('click',async e=>{
    e.stopImmediatePropagation();e.preventDefault();
    const selected=document.querySelector('.intent-option.selected');
    if(!selected){alert('Chọn một trạng thái trước nhé.');return}
    const btn=e.currentTarget;btn.disabled=true;btn.textContent='Đang lưu...';
    const payload={jobId,intent:selected.dataset.intent,guestId:guestId(),sourceChannel:sourceChannel()};
    const remote=await post('/api/intent',payload);saveGuest(remote?.data);
    localStorage.setItem('pqc-intent',JSON.stringify({...payload,confirmedAt:new Date().toISOString(),remote:Boolean(remote?.ok)}));
    close('interestModal');
    if($('interestBtn')) $('interestBtn').textContent=remote?.ok?'✓ Đã lưu trạng thái':'✓ Đã lưu tạm trên thiết bị';
    btn.disabled=false;btn.textContent='Lưu trạng thái';
  },true);

  $('submitApplyBtn')?.addEventListener('click',async e=>{
    e.stopImmediatePropagation();e.preventDefault();
    const name=$('applyName')?.value.trim(),phone=$('applyPhone')?.value.trim();
    if(!name||!phone){alert('Cho HR biết tên và số điện thoại/Zalo trước nhé.');return}
    if(!$('applyConsent')?.checked){alert('Bạn cần đồng ý gửi thông tin cho nhà tuyển dụng của vị trí này.');return}
    const btn=e.currentTarget;btn.disabled=true;btn.textContent='Đang gửi...';
    const payload={jobId,name,phone,interviewPreference:$('applyInterview')?.value||'',availableDate:$('applyStart')?.value||'',consent:true,guestId:guestId(),sourceChannel:sourceChannel()};
    const remote=await post('/api/applications',payload);
    if(remote?.status===409&&remote.data?.error==='already_applied'){
      alert('Bạn đã ứng tuyển vị trí này rồi.');btn.disabled=false;btn.textContent='Gửi ứng tuyển';return;
    }
    saveGuest(remote?.data);
    let trackingPath=null;
    if(remote?.ok&&remote.data?.applicationId&&remote.data?.trackingToken){
      localStorage.setItem(`pqc-tracking:${remote.data.applicationId}`,remote.data.trackingToken);
      trackingPath=`application.html?id=${encodeURIComponent(remote.data.applicationId)}`;
      localStorage.setItem('pqc-latest-application',JSON.stringify({jobId,applicationId:remote.data.applicationId,trackingPath,createdAt:new Date().toISOString()}));
    }
    localStorage.setItem('pqc-light-profile',JSON.stringify({...payload,createdAt:new Date().toISOString(),remote:Boolean(remote?.ok),applicationId:remote?.data?.applicationId||null}));
    const box=$('applySuccess');
    if(box){
      if(remote?.ok){box.innerHTML=`✓ Đã gửi vào hệ thống tuyển dụng.${trackingPath?` <a class="text-link" href="${trackingPath}">Theo dõi ứng tuyển →</a>`:''}`}
      else box.textContent='✓ Đã lưu tạm trên thiết bị. Chưa gửi cho HR vì backend hiện chưa kết nối.';
      box.classList.add('show');
    }
    btn.textContent=remote?.ok?'Đã gửi':'Đã lưu tạm';
    btn.disabled=false;
  },true);
})();
