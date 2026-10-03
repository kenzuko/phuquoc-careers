(function(){
  const root=document.getElementById('quickJobFeed');if(!root)return;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const contactHref=(type,value)=>{if(!value)return'';if(type==='email')return`mailto:${encodeURIComponent(value)}`;if(type==='phone')return`tel:${String(value).replace(/[^+\d]/g,'')}`;if(type==='zalo')return`https://zalo.me/${String(value).replace(/[^\d]/g,'')}`;return''};
  const label=x=>x.trust_state==='employer_verified'?'Nhà tuyển dụng đã xác minh':'Tin do người đăng cung cấp';
  function card(x){const href=contactHref(x.contact_type,x.contact);return `<article class="job-card quick-job-card"><div class="job-body"><div class="job-main"><div class="eyebrow">Tin tuyển nhanh</div><h3>${esc(x.title)}</h3><div class="job-meta"><span>${esc(x.employer_name||'Nơi tuyển')}</span><span>·</span><span>${esc(x.zone||'Phú Quốc')}</span><span>·</span><span>${esc(label(x))}</span></div>${x.salary_text?`<div class="job-pay"><strong>${esc(x.salary_text)}</strong>${x.shift_text?`<span>${esc(x.shift_text)}</span>`:''}</div>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}<div class="job-actions">${href?`<a class="btn btn-primary btn-sm" href="${esc(href)}" ${x.contact_type==='zalo'?'target="_blank" rel="noopener"':''}>Liên hệ người tuyển →</a>`:''}<span class="results-note">Hết hạn ${esc(new Date(x.expires_at).toLocaleDateString('vi-VN'))}</span></div></div></div></article>`}
  fetch('/api/quick-jobs',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    const items=data.items||[];if(!items.length){root.closest('.quick-feed-section')?.remove();return}
    root.innerHTML=items.map(card).join('');const n=document.getElementById('quickJobCount');if(n)n.textContent=`${items.length} tin đang còn hạn`;
  }).catch(()=>root.closest('.quick-feed-section')?.remove());
})();
