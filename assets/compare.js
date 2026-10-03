(function(){
  const jobs=window.PQC_JOBS||[];const byId=new Map(jobs.map(j=>[String(j.id),j]));
  const saved=JSON.parse(localStorage.getItem('pqc-saved')||'[]').map(String).filter(id=>byId.has(id));
  const selectedKey='pqc-compare-selected';let selected=JSON.parse(localStorage.getItem(selectedKey)||'[]').map(String).filter(id=>saved.includes(id)).slice(0,3);
  if(selected.length<2)selected=saved.slice(0,3);
  const $=id=>document.getElementById(id);const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmtBool=v=>v===true?'Có':v===false?'Không':'Chưa xác nhận';
  const hasAcc=j=>j.staffHouse===true||(j.tags||[]).some(x=>/accommodation|staff house|lưu trú|chỗ ở/i.test(x));
  const hasSvc=j=>j.serviceCharge===true||(j.tags||[]).some(x=>/service charge|phí phục vụ/i.test(x));
  const hasShuttle=j=>j.shuttle===true||(j.tags||[]).some(x=>/shuttle|đưa đón|đưa rước/i.test(x));
  function effective(v,mentioned){return v===true?'Có':v===false?'Không':mentioned?'Có đề cập':'Chưa xác nhận'}
  function saveSelection(){localStorage.setItem(selectedKey,JSON.stringify(selected))}
  function renderPicker(){
    const box=$('comparePicker');if(!box)return;
    if(!saved.length){box.innerHTML='';return}
    box.innerHTML=`<div class="compare-picker-head"><div><strong>Việc đã lưu</strong><span>Chọn 2-3 việc để so sánh</span></div><button id="clearSaved" class="btn btn-ghost">Xóa danh sách lưu</button></div><div class="compare-picker-list">${saved.map(id=>{const j=byId.get(id);const on=selected.includes(id);return `<label class="compare-pick ${on?'active':''}"><input type="checkbox" value="${esc(id)}" ${on?'checked':''}><span><strong>${esc(j.title)}</strong><small>${esc(j.employer)} · ${esc(j.location||'Phú Quốc')}</small></span></label>`}).join('')}</div>`;
    box.querySelectorAll('input[type="checkbox"]').forEach(input=>input.addEventListener('change',()=>{
      const id=input.value;if(input.checked){if(!selected.includes(id)){if(selected.length>=3){input.checked=false;alert('So sánh tối đa 3 việc một lần nhé.');return}selected.push(id)}}else selected=selected.filter(x=>x!==id);
      saveSelection();render();
    }));
    $('clearSaved')?.addEventListener('click',()=>{if(!confirm('Xóa toàn bộ việc đã lưu trên thiết bị này?'))return;localStorage.removeItem('pqc-saved');localStorage.removeItem(selectedKey);location.reload()});
  }
  function q(j){
    const rows=[];
    if(!j.salary)rows.push('Lương');
    if(j.serviceCharge==null&&!hasSvc(j))rows.push('Service charge');
    if(j.staffHouse==null&&!hasAcc(j))rows.push('Staff house');
    if(j.shuttle==null&&!hasShuttle(j))rows.push('Shuttle');
    if(!j.meals)rows.push('Bữa ăn');
    if(!j.offDays)rows.push('Ngày nghỉ');
    return rows.length?`Cần hỏi: ${rows.join(', ')}`:'Các field chính đã có dữ liệu';
  }
  function renderTable(){
    const rows=selected.map(id=>byId.get(id)).filter(Boolean);if(rows.length<2){$('compareView')?.classList.add('hide');$('compareEmpty')?.classList.remove('hide');return}
    $('compareEmpty')?.classList.add('hide');$('compareView')?.classList.remove('hide');
    const fields=[
      ['Lương',j=>j.salary||'Chưa công khai'],['Service charge',j=>effective(j.serviceCharge,hasSvc(j))],['Staff house / lưu trú',j=>effective(j.staffHouse,hasAcc(j))],['Bữa ăn',j=>j.meals?`${j.meals} bữa/ngày`:'Chưa xác nhận'],['Shuttle',j=>effective(j.shuttle,hasShuttle(j))],['Ngày nghỉ',j=>j.offDays||'Chưa xác nhận'],['Khu vực',j=>j.zone||j.location||'Phú Quốc'],['Kinh nghiệm',j=>j.experience||'Chưa xác nhận'],['Tiếng Anh',j=>j.english||'Chưa xác nhận'],['Độ mới',j=>j.fresh?'Nguồn còn fresh':(j.freshnessStatus||'Cần kiểm tra lại')],['Nguồn',j=>j.verifiedByEmployer?'Employer confirmed':(j.sourceType||'Nguồn chính thức')],['Điểm cần hỏi HR',j=>q(j)]
    ];
    $('compareTable').innerHTML=`<div class="compare-grid compare-head"><div class="compare-label"></div>${rows.map(j=>`<div class="compare-job-head"><strong>${esc(j.title)}</strong><span>${esc(j.employer)}</span><a class="text-link" href="job.html?id=${encodeURIComponent(j.id)}">Xem job →</a></div>`).join('')}</div>${fields.map(([label,get])=>`<div class="compare-grid compare-row"><div class="compare-label">${esc(label)}</div>${rows.map(j=>`<div>${esc(get(j))}</div>`).join('')}</div>`).join('')}`;
  }
  function render(){renderPicker();renderTable()}
  render();
})();