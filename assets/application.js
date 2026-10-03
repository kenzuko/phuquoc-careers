(function(){
  const $=id=>document.getElementById(id);
  const p=new URLSearchParams(location.search);const applicationId=p.get('id');
  const token=applicationId?localStorage.getItem(`pqc-tracking:${applicationId}`):null;
  const order=['submitted','viewed','shortlisted','interview','offer','joined'];
  const labels={submitted:'Đã gửi',viewed:'HR đã xem',shortlisted:'Được shortlist',interview:'Mời phỏng vấn',offer:'Nhận offer',joined:'Đã nhận việc',rejected:'Không tiếp tục',withdrawn:'Đã rút ứng tuyển'};
  const descriptions={submitted:'Hệ thống đã nhận ứng tuyển.',viewed:'Nhà tuyển dụng đã mở hồ sơ.',shortlisted:'Hồ sơ đang được cân nhắc cho bước tiếp theo.',interview:'Nhà tuyển dụng muốn trao đổi/phỏng vấn.',offer:'Nhà tuyển dụng đã chuyển sang giai đoạn offer.',joined:'Quy trình tuyển dụng đã ghi nhận bạn nhận việc.'};
  let selectedReason='other';
  const fmt=value=>{if(!value)return 'Chưa có';try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return value}};
  const close=id=>window.PQC_closeModal?.(id);
  function open(id){$(id)?.classList.add('show')}
  function trackingHeaders(extra={}){return {...extra,'x-pqc-tracking-token':token||''}}
  function render(data){
    $('trackingLoading')?.classList.add('hide');$('trackingError')?.classList.add('hide');$('trackingContent')?.classList.remove('hide');
    $('trackingTitle').textContent=data.title||'Ứng tuyển';$('trackingEmployer').textContent=data.employer||'Nhà tuyển dụng';$('trackingStatusBadge').textContent=labels[data.status]||data.status;
    $('trackingSubmitted').textContent=fmt(data.submittedAt);$('trackingChanged').textContent=fmt(data.statusChangedAt||data.submittedAt);
    const currentIndex=order.indexOf(data.status);
    $('trackingTimeline').innerHTML=order.map((status,i)=>{
      const done=currentIndex>=0&&i<currentIndex;const current=status===data.status;const state=done?'done':current?'current':'';
      return `<div class="timeline-step ${state}"><span class="timeline-dot">${done?'✓':i+1}</span><div class="timeline-copy"><strong>${labels[status]}</strong><span>${descriptions[status]}</span></div></div>`;
    }).join('');
    const closed=['joined','rejected','withdrawn'].includes(data.status);
    $('withdrawPanel')?.classList.toggle('hide',closed);
    if(closed){
      const messages={joined:'Quy trình này đã kết thúc với trạng thái nhận việc.',rejected:'Nhà tuyển dụng đã kết thúc quy trình cho vị trí này.',withdrawn:'Bạn đã rút ứng tuyển. HR sẽ không còn coi hồ sơ này là ứng viên đang active.'};
      $('trackingClosed').textContent=messages[data.status]||'Quy trình này đã kết thúc.';$('trackingClosed').classList.remove('hide');
    }
  }
  async function load(){
    if(!applicationId||!token){$('trackingLoading')?.classList.add('hide');$('trackingError')?.classList.remove('hide');return}
    try{const res=await fetch(`/api/applications/${encodeURIComponent(applicationId)}`,{headers:trackingHeaders({accept:'application/json'})});if(!res.ok)throw new Error('not found');render(await res.json())}
    catch{$('trackingLoading')?.classList.add('hide');$('trackingError')?.classList.remove('hide')}
  }
  $('withdrawBtn')?.addEventListener('click',()=>open('withdrawModal'));
  document.querySelectorAll('[data-withdraw-reason]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-withdraw-reason]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');selectedReason=btn.dataset.withdrawReason||'other'}));
  $('confirmWithdrawBtn')?.addEventListener('click',async e=>{
    const btn=e.currentTarget;btn.disabled=true;btn.textContent='Đang cập nhật...';
    try{
      const res=await fetch(`/api/applications/${encodeURIComponent(applicationId)}/withdraw`,{method:'POST',headers:trackingHeaders({'content-type':'application/json'}),body:JSON.stringify({reason:selectedReason})});
      const data=await res.json().catch(()=>null);if(!res.ok)throw new Error(data?.error||'failed');close('withdrawModal');await load();
    }catch{alert('Chưa cập nhật được trạng thái. Thử lại sau nhé.')}finally{btn.disabled=false;btn.textContent='Xác nhận rút'}
  });
  load();
})();
