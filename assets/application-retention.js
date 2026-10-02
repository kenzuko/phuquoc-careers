(function(){
  const appId=new URLSearchParams(location.search).get('id');if(!appId)return;
  const token=localStorage.getItem(`pqc-tracking:${appId}`);if(!token)return;
  const labels={still_working:'Vẫn đang làm',left:'Đã nghỉ',prefer_not_to_say:'Không muốn trả lời'};
  const reasons={salary:'Thu nhập',schedule:'Ca / lịch làm',location_transport:'Địa điểm / di chuyển',role_fit:'Công việc thực tế',culture:'Môi trường',management:'Quản lý',personal:'Lý do cá nhân',other:'Khác'};
  const headers=extra=>({...extra,'x-pqc-tracking-token':token});
  const fmt=v=>{try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium'}).format(new Date(v))}catch{return v||''}};
  let currentData=null,editingDays=null;

  function ensure(){let box=document.getElementById('retentionPanel');if(box)return box;const anchor=document.querySelector('#trackingContent .truth-note');if(!anchor)return null;box=document.createElement('section');box.id='retentionPanel';box.className='retention-panel hide';anchor.insertAdjacentElement('beforebegin',box);return box}
  async function state(){try{const r=await fetch(`/api/applications/${encodeURIComponent(appId)}/retention`,{headers:headers({accept:'application/json'})});if(!r.ok)return null;return await r.json()}catch{return null}}
  async function respond(days,response,reason=null){const payload={response};if(reason)payload.reason=reason;try{const r=await fetch(`/api/applications/${encodeURIComponent(appId)}/retention/${days}`,{method:'POST',headers:headers({'content-type':'application/json'}),body:JSON.stringify(payload)});const data=await r.json().catch(()=>null);if(r.status===503){alert('Check-in này chưa được mở trên hệ thống.');return null}if(r.status===409&&data?.error==='checkin_not_due'){alert(`Mốc này sẽ mở từ ${fmt(data.dueAt)}.`);return null}if(!r.ok){alert('Chưa lưu được check-in.');return null}return data}catch{alert('Chưa kết nối được hệ thống.');return null}}

  function reasonOptions(){return Object.entries(reasons).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
  function editor(w){return `<article class="retention-window due" data-retention-window="${w.days}"><div><span class="mini-label">${w.days} ngày</span><strong>Bạn còn làm ở đây không?</strong><small>Một câu trả lời ngắn giúp dữ liệu việc làm Phú Quốc bớt “ảo”.</small></div><div class="retention-actions"><button class="btn btn-primary" data-retention-response="still_working">Vẫn đang làm</button><button class="btn btn-ghost" data-retention-response="left">Đã nghỉ</button><button class="btn btn-link" data-retention-response="prefer_not_to_say">Không muốn trả lời</button></div><div class="retention-left-reason hide"><label>Lý do chính nếu bạn muốn cho biết<select>${reasonOptions()}</select></label><button class="btn btn-primary" data-retention-submit-left>Xác nhận đã nghỉ</button></div>${w.response?'<button class="btn btn-link" data-retention-cancel>Sử dụng câu trả lời hiện tại</button>':''}</article>`}
  function windowCard(w){
    const due=new Date(w.dueAt).getTime()<=Date.now();const answered=w.response;
    if(editingDays===w.days)return editor(w);
    if(answered)return `<article class="retention-window answered"><div><span class="mini-label">${w.days} ngày</span><strong>${labels[answered.response]||answered.response}</strong><small>${answered.reason?`${reasons[answered.reason]||answered.reason} · `:''}${fmt(answered.responded_at)}</small></div><button class="btn btn-link" data-retention-edit="${w.days}">Cập nhật</button></article>`;
    if(!due)return `<article class="retention-window pending"><div><span class="mini-label">${w.days} ngày</span><strong>Check-in từ ${fmt(w.dueAt)}</strong><small>Không cần làm gì lúc này.</small></div></article>`;
    return editor(w)
  }

  function paint(){
    const data=currentData,box=ensure();if(!box)return;if(!data||data.status!=='joined'){box.classList.add('hide');return}
    box.classList.remove('hide');box.innerHTML=`<div class="retention-head"><div><span class="mini-label">Sau khi nhận việc</span><h3>30 / 90 ngày</h3></div><span class="job-status">Bắt đầu ${fmt(data.joinedAt)}</span></div><p>Không đánh giá bạn hay nhà tuyển dụng. Chỉ xác nhận việc làm có thực sự duy trì hay không.</p><div class="retention-windows">${(data.windows||[]).map(windowCard).join('')}</div>`;
    box.querySelectorAll('[data-retention-response]').forEach(btn=>btn.addEventListener('click',async()=>{const card=btn.closest('[data-retention-window]');const days=Number(card.dataset.retentionWindow);const response=btn.dataset.retentionResponse;if(response==='left'){card.querySelector('.retention-left-reason')?.classList.remove('hide');return}btn.disabled=true;const out=await respond(days,response);if(out){editingDays=null;await refresh()}else btn.disabled=false}));
    box.querySelectorAll('[data-retention-submit-left]').forEach(btn=>btn.addEventListener('click',async()=>{const card=btn.closest('[data-retention-window]');const days=Number(card.dataset.retentionWindow);const reason=card.querySelector('select')?.value||'other';btn.disabled=true;const out=await respond(days,'left',reason);if(out){editingDays=null;await refresh()}else btn.disabled=false}));
    box.querySelectorAll('[data-retention-edit]').forEach(btn=>btn.addEventListener('click',()=>{editingDays=Number(btn.dataset.retentionEdit);paint()}));
    box.querySelectorAll('[data-retention-cancel]').forEach(btn=>btn.addEventListener('click',()=>{editingDays=null;paint()}));
  }
  async function refresh(){currentData=await state();paint()}
  const target=document.getElementById('trackingContent');if(target){new MutationObserver(()=>{if(!target.classList.contains('hide'))refresh()}).observe(target,{attributes:true,attributeFilter:['class']})}refresh();
})();