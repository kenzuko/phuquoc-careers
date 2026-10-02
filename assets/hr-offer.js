(function(){
  const root=document.getElementById('hrCandidates');if(!root)return;const token=localStorage.getItem('pqc-hr-session');if(!token)return;
  const labels={accepted:'Đã nhận offer',considering:'Đang cân nhắc',waiting_other_offer:'Đang chờ offer khác',declined:'Đã từ chối offer'};
  const reasons={salary:'Thu nhập',housing:'Nhà ở',shift:'Ca làm',transport:'Di chuyển',days_off:'Ngày nghỉ',family:'Gia đình',current_job:'Công việc hiện tại',other:'Lý do khác'};
  const fmt=v=>{if(!v)return '';try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return v}};
  async function get(id){try{const r=await fetch(`/api/hr/applications/${encodeURIComponent(id)}/offer`,{headers:{accept:'application/json',authorization:`Bearer ${token}`}});if(!r.ok)return null;return await r.json()}catch{return null}}
  async function enhance(card){if(card.dataset.offerEnhanced==='1'||card.dataset.status!=='offer')return;card.dataset.offerEnhanced='1';const data=await get(card.dataset.appId);if(!data)return;const box=document.createElement('div');box.className=`hr-offer-state ${data.response||'pending'}`;box.innerHTML=data.response?`<strong>${labels[data.response]||data.response}</strong><span>${data.responseAt?fmt(data.responseAt):''}${data.reason?` · ${reasons[data.reason]||data.reason}`:''}</span>`:'<strong>Chưa có phản hồi offer</strong><span>Ứng viên có thể trả lời từ link tracking riêng.</span>';card.firstElementChild?.appendChild(box)}
  function scan(){root.querySelectorAll('.hr-candidate[data-status="offer"]').forEach(enhance)}
  new MutationObserver(scan).observe(root,{childList:true,subtree:false});scan();
})();