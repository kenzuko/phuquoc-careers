(function(){
  const root=document.getElementById('hrCandidates');if(!root)return;const token=localStorage.getItem('pqc-hr-session');if(!token)return;
  const fmt=v=>{if(!v)return 'Chưa đặt lịch';try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return v}};
  const labels={confirmed:'Ứng viên đã xác nhận',reschedule:'Ứng viên xin đổi lịch',cannot_attend:'Ứng viên báo không tham gia'};
  async function api(id,opts={}){const headers={accept:'application/json',authorization:`Bearer ${token}`,...(opts.headers||{})};const r=await fetch(`/api/hr/applications/${encodeURIComponent(id)}/interview`,{...opts,headers});let data=null;try{data=await r.json()}catch{}return {r,data}}
  async function enhanceCard(card){
    if(card.dataset.interviewEnhanced==='1'||card.dataset.status!=='interview')return;card.dataset.interviewEnhanced='1';const id=card.dataset.appId;const out=await api(id);if(!out.r.ok)return;
    const state=out.data||{};const panel=document.createElement('div');panel.className='hr-interview-box';
    const response=state.response?`<div class="hr-interview-response ${state.response}"><strong>${labels[state.response]||state.response}</strong>${state.responseAt?`<span>${fmt(state.responseAt)}</span>`:''}${state.proposedAt?`<span>Đề xuất: ${fmt(state.proposedAt)}</span>`:''}</div>`:'<div class="hr-interview-response pending"><strong>Chưa có phản hồi từ ứng viên</strong><span>Ứng viên có thể xác nhận từ link tracking riêng.</span></div>';
    panel.innerHTML=`<div class="hr-interview-head"><span class="mini-label">Lịch phỏng vấn</span><strong>${state.scheduledAt?fmt(state.scheduledAt):'Chưa đặt giờ'}</strong></div>${response}<div class="hr-interview-schedule"><label>Đặt / đổi lịch<input type="datetime-local" data-interview-at></label><button class="btn btn-ghost" data-save-interview>Lưu lịch</button></div><span class="small">Đổi lịch sẽ xóa phản hồi cũ để ứng viên xác nhận lại.</span>`;
    const left=card.firstElementChild;left?.appendChild(panel);
    panel.querySelector('[data-save-interview]')?.addEventListener('click',async e=>{const value=panel.querySelector('[data-interview-at]')?.value;if(!value){alert('Chọn ngày giờ phỏng vấn trước nhé.');return}e.currentTarget.disabled=true;e.currentTarget.textContent='Đang lưu...';const saved=await api(id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({scheduledAt:new Date(value).toISOString()})});if(saved.r.ok){card.dataset.interviewEnhanced='0';panel.remove();enhanceCard(card)}else{alert('Chưa lưu được lịch phỏng vấn.');e.currentTarget.disabled=false;e.currentTarget.textContent='Lưu lịch'}});
  }
  function scan(){root.querySelectorAll('.hr-candidate[data-status="interview"]').forEach(enhanceCard)}
  new MutationObserver(scan).observe(root,{childList:true,subtree:false});scan();
})();