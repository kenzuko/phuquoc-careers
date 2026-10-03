(function(){
  const token=localStorage.getItem('pqc-hr-session');if(!token)return;
  const labels={still_working:'Vẫn đang làm',left:'Đã nghỉ',prefer_not_to_say:'Không muốn trả lời'};
  const reasons={salary:'Thu nhập',schedule:'Ca / lịch làm',location_transport:'Địa điểm / di chuyển',role_fit:'Công việc thực tế',culture:'Môi trường',management:'Quản lý',personal:'Lý do cá nhân',other:'Khác'};
  const fmt=v=>{try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium'}).format(new Date(v))}catch{return v||''}};
  async function load(card){
    if(card.dataset.retentionLoaded==='1'||card.dataset.status!=='joined')return;card.dataset.retentionLoaded='1';
    const appId=card.dataset.appId;if(!appId)return;
    try{
      const r=await fetch(`/api/hr/applications/${encodeURIComponent(appId)}/retention`,{headers:{accept:'application/json',authorization:`Bearer ${token}`}});if(!r.ok)return;
      const data=await r.json();const wrap=document.createElement('div');wrap.className='hr-retention-summary';
      wrap.innerHTML=`<span class="mini-label">Giữ việc sau khi nhận</span><div>${(data.windows||[]).map(w=>{const a=w.response;if(a)return `<span class="hr-retention-chip answered"><strong>${w.days}d</strong> ${labels[a.response]||a.response}${a.reason?` · ${reasons[a.reason]||a.reason}`:''}</span>`;const due=Date.now()>=new Date(w.dueAt).getTime();return `<span class="hr-retention-chip ${due?'due':'pending'}"><strong>${w.days}d</strong> ${due?'Chưa phản hồi':`Từ ${fmt(w.dueAt)}`}</span>`}).join('')}</div>`;
      card.querySelector('div')?.appendChild(wrap);
    }catch{}
  }
  function scan(){document.querySelectorAll('#hrCandidates [data-app-id][data-status="joined"]').forEach(load)}
  const root=document.getElementById('hrCandidates');if(root)new MutationObserver(scan).observe(root,{childList:true,subtree:true});scan();
})();