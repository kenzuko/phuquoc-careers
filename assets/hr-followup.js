(function(){
  const token=localStorage.getItem('pqc-hr-session');if(!token)return;
  const labels={still_interested:'Vẫn muốn tiếp tục',considering:'Đang cân nhắc',no_longer_interested:'Không tiếp tục'};
  const reasonLabels={salary:'Thu nhập',role_fit:'Công việc chưa hợp',schedule:'Ca / lịch làm',location_transport:'Địa điểm / di chuyển',culture:'Môi trường làm việc',accepted_other_offer:'Đã nhận offer khác',other:'Lý do khác'};
  const seen=new Set();
  async function decorate(card){const appId=card.dataset.appId;if(!appId||seen.has(appId))return;seen.add(appId);try{const r=await fetch(`/api/hr/applications/${encodeURIComponent(appId)}/post-interview`,{headers:{accept:'application/json',authorization:`Bearer ${token}`}});if(!r.ok)return;const state=await r.json();if(!state.response)return;const target=card.querySelector('.hr-candidate-meta')?.parentElement||card.firstElementChild;const note=document.createElement('div');note.className=`hr-followup-note followup-${state.response}`;note.innerHTML=`<strong>Sau phỏng vấn: ${labels[state.response]||state.response}</strong>${state.reason?`<span>${reasonLabels[state.reason]||state.reason}</span>`:''}`;target.appendChild(note)}catch{}}
  function scan(){document.querySelectorAll('#hrCandidates [data-app-id]').forEach(decorate)}
  const root=document.getElementById('hrCandidates');if(root){new MutationObserver(()=>{seen.clear();scan()}).observe(root,{childList:true,subtree:true});scan()}
})();