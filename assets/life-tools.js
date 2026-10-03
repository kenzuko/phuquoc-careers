(function(){
  const jobs=window.PQC_JOBS||[],zone=document.getElementById('lifeZone'),list=document.getElementById('lifeJobsList');
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const has=(j,re)=>JSON.stringify(j).match(re);
  function set(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
  function render(){
    const z=zone?.value||'';if(!z){set('lifeJobs','-');set('lifeHousing','-');set('lifeShuttle','-');if(list)list.innerHTML='';return}
    const rows=jobs.filter(j=>j.zone===z||String(j.location||'').includes(z));
    set('lifeJobs',rows.length);set('lifeHousing',rows.filter(j=>j.staffHouse===true||has(j,/staff house|chỗ ở|accommodation/i)).length);set('lifeShuttle',rows.filter(j=>j.shuttle===true||has(j,/shuttle|đưa đón|đưa rước/i)).length);
    if(!list)return;
    if(!rows.length){list.innerHTML=`<div class="career-empty"><strong>Chưa có việc đang hiển thị ở ${esc(z)}.</strong><span>Điều này chỉ phản ánh dữ liệu hiện tại, không có nghĩa khu vực này không tuyển.</span></div>`;return}
    list.innerHTML=`<div class="section-head"><div><div class="eyebrow">${esc(z)}</div><h2>Việc đang mở trong khu vực</h2></div><a class="text-link" href="jobs.html?zone=${encodeURIComponent(z)}">Xem tất cả →</a></div>`+rows.slice(0,5).map(j=>`<a class="career-side-item" href="job.html?id=${encodeURIComponent(j.id)}"><strong>${esc(j.title)}</strong><span>${esc(j.employer||'Nhà tuyển dụng')} · ${j.staffHouse===true?'Có chỗ ở đã xác nhận':'Chỗ ở: '+(j.staffHouse===false?'không':'chưa rõ')} · ${j.shuttle===true?'Có shuttle':'Shuttle: '+(j.shuttle===false?'không':'chưa rõ')}</span></a>`).join('');
  }
  zone?.addEventListener('change',render);render();
})();
