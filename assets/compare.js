(function(){
  const jobs=window.PQC_JOBS||[];
  const byId=new Map(jobs.map(j=>[String(j.id),j]));
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]').map(String)}catch{return[]}};
  const saved=[...new Set(read('pqc-saved').filter(id=>byId.has(id)))];
  const compareKey='pqc-compare';
  let selected=[...new Set(read(compareKey).filter(id=>byId.has(id)))].slice(0,3);
  if(selected.length<2)selected=saved.slice(0,3);
  const hasAcc=j=>j.staffHouse===true||j.staffHouseMentioned===true||(j.tags||[]).some(x=>/accommodation|staff house|lưu trú|chỗ ở/i.test(x));
  const hasSvc=j=>j.serviceCharge===true||(j.tags||[]).some(x=>/service charge|phí phục vụ/i.test(x));
  const hasShuttle=j=>j.shuttle===true||(j.tags||[]).some(x=>/shuttle|đưa đón|đưa rước/i.test(x));
  const hasMeals=j=>Boolean(j.meals)||(j.tags||[]).some(x=>/meal|bữa|ăn ca|cơm ca/i.test(x));
  const trust=j=>j.verifiedByEmployer?'Nhà tuyển dụng xác nhận':/official/i.test(j.sourceType||'')?'Nguồn tuyển dụng chính thức':j.sourceType||'Có nguồn đối chiếu';
  function fact(value,state='plain'){return {value:value||'Chưa xác nhận',state}}
  function tri(value,mentioned){if(value===true)return fact('Có','yes');if(value===false)return fact('Không','no');if(mentioned)return fact('Có đề cập - chưa xác nhận','unknown');return fact('Chưa xác nhận','unknown')}
  function sourceFresh(j){if(j.verifiedByEmployer)return fact(`Nhà tuyển dụng xác nhận · ${j.lastChecked||'gần đây'}`,'yes');if(j.fresh)return fact(`Kiểm tra trên nguồn · ${j.lastChecked||'gần đây'}`,'yes');return fact(`Cần kiểm tra lại · ${j.lastChecked||'chưa rõ'}`,'unknown')}
  function questions(j){const q=[];if(!j.salary)q.push('lương');if(j.serviceCharge==null&&!hasSvc(j))q.push('service charge');if(j.staffHouse==null&&!hasAcc(j))q.push('chỗ ở');if(j.shuttle==null&&!hasShuttle(j))q.push('shuttle');if(!j.meals&&!hasMeals(j))q.push('bữa ăn');if(!j.offDays)q.push('ngày nghỉ');return q}
  function saveSelection(){localStorage.setItem(compareKey,JSON.stringify(selected));localStorage.setItem('pqc-saved',JSON.stringify([...new Set([...saved,...selected])]))}
  function renderPicker(){
    const box=$('comparePicker');if(!box)return;
    const pool=[...new Set([...saved,...selected])].filter(id=>byId.has(id));
    if(!pool.length){box.innerHTML='';return}
    box.innerHTML=`<div class="compare-picker-head"><div><strong>Việc đã lưu</strong><span>Chọn 2-3 việc để đặt cạnh nhau</span></div><button id="clearCompare" class="btn btn-soft btn-sm">Bỏ lựa chọn so sánh</button></div><div class="compare-picker-list">${pool.map(id=>{const j=byId.get(id),on=selected.includes(id);return `<label class="compare-pick ${on?'active':''}"><input type="checkbox" value="${esc(id)}" ${on?'checked':''}><span><strong>${esc(j.title)}</strong><small>${esc(j.zone||j.location||'Phú Quốc')} · ${esc(trust(j))}</small></span></label>`}).join('')}</div>`;
    box.querySelectorAll('input[type="checkbox"]').forEach(input=>input.addEventListener('change',()=>{const id=input.value;if(input.checked){if(!selected.includes(id)){if(selected.length>=3){input.checked=false;alert('So sánh tối đa 3 việc một lần nhé.');return}selected.push(id)}}else selected=selected.filter(x=>x!==id);saveSelection();render()}));
    $('clearCompare')?.addEventListener('click',()=>{selected=[];localStorage.removeItem(compareKey);render()});
  }
  function rowsFor(j){
    const q=questions(j);
    return [
      ['Lương',j.salary?fact(j.salary,'yes'):fact('Chưa công khai','unknown')],
      ['Service charge',tri(j.serviceCharge,hasSvc(j))],
      ['Nhà ở',tri(j.staffHouse,hasAcc(j))],
      ['Bữa ăn',j.meals?fact(`${j.meals} bữa/ngày`,'yes'):hasMeals(j)?fact('Có đề cập - chưa xác nhận','unknown'):fact('Chưa xác nhận','unknown')],
      ['Shuttle',tri(j.shuttle,hasShuttle(j))],
      ['Ngày nghỉ',j.offDays?fact(j.offDays,'yes'):fact('Chưa xác nhận','unknown')],
      ['Khu vực',fact(j.zone||j.location||'Phú Quốc')],
      ['Loại hình',fact(j.employment||'Chưa xác nhận',j.employment?'plain':'unknown')],
      ['Kinh nghiệm',fact(j.experience||'Chưa xác nhận',j.experience?'plain':'unknown')],
      ['Tiếng Anh',fact(j.english||'Chưa xác nhận',j.english?'plain':'unknown')],
      ['Độ mới',sourceFresh(j)],
      ['Bằng chứng nguồn',fact(trust(j))],
      ['Cần hỏi HR',fact(q.length?q.join(', '):'Không còn trường chính nào đang thiếu','plain')]
    ]
  }
  function renderColumns(){
    const chosen=selected.map(id=>byId.get(id)).filter(Boolean);
    if(chosen.length<2){$('compareView')?.classList.add('hide');$('compareEmpty')?.classList.remove('hide');return}
    $('compareEmpty')?.classList.add('hide');$('compareView')?.classList.remove('hide');
    const table=$('compareTable');if(!table)return;
    table.style.setProperty('--compare-count',String(chosen.length));
    table.innerHTML=`<div class="compare-columns" style="--compare-count:${chosen.length}">${chosen.map(j=>`<article class="compare-column"><div class="compare-column-head"><div class="eyebrow">${esc(j.zone||j.location||'Phú Quốc')}</div><h3>${esc(j.title)}</h3><p>${esc(j.employer)} · ${esc(trust(j))}</p><a href="job.html?id=${encodeURIComponent(j.id)}">Xem chi tiết →</a></div>${rowsFor(j).map(([label,f])=>`<div class="compare-fact ${esc(f.state)}"><small>${esc(label)}</small><strong>${esc(f.value)}</strong></div>`).join('')}<div class="compare-questions"><small>Trade-off cần tự cân nhắc</small><span>PhuQuocCareers không chọn job thắng. Hãy nhìn tổng gói công việc và những trường còn thiếu.</span></div></article>`).join('')}</div>`
  }
  function render(){renderPicker();renderColumns()}
  render();
})();