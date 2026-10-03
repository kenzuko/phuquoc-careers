(function(){
  const root=document.getElementById('jobDetail');if(!root)return;
  const jobs=window.PQC_JOBS||[];const params=new URLSearchParams(location.search);const jobId=params.get('id');const needRaw=(params.get('need')||'').trim().slice(0,240);const job=jobs.find(j=>String(j.id)===String(jobId));if(!job)return;
  if(!document.querySelector('link[data-pqc-job-decision]')){const l=document.createElement('link');l.rel='stylesheet';l.href='assets/job-decision.css';l.dataset.pqcJobDecision='1';document.head.appendChild(l)}
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const hasAcc=j=>j.staffHouse===true||(j.tags||[]).some(x=>/accommodation|staff house|lưu trú|chỗ ở/i.test(x));
  const hasSvc=j=>j.serviceCharge===true||(j.tags||[]).some(x=>/service charge|phí phục vụ/i.test(x));
  const hasShuttle=j=>j.shuttle===true||(j.tags||[]).some(x=>/shuttle|đưa đón|đưa rước/i.test(x));
  const hasMeals=j=>Boolean(j.meals)||(j.tags||[]).some(x=>/meal|bữa|ăn ca|cơm ca/i.test(x));
  const salaryValue=t=>{const m=String(t||'').match(/(\d{1,2}(?:[.,]\d+)?)/);return m?Number(m[1].replace(',','.')):null};
  function parseNeed(text){
    const t=text.toLowerCase();const n={};
    const deps=[['F&B',['phục vụ','f&b','nhà hàng','restaurant','bartender','bar']],['Front Office',['lễ tân','front office','reception','guest service']],['Housekeeping',['buồng phòng','housekeeping','room attendant']],['Nhân sự',['nhân sự','hr','human resources','people & culture']],['Reservations',['đặt phòng','reservation']],['Spa & Wellness',['spa','wellness']],['Giải trí',['giải trí','recreation','hoạt động biển','fitness']]];
    for(const [d,k] of deps){if(k.some(x=>t.includes(x))){n.department=d;break}}
    if(t.includes('dương đông'))n.zone='Dương Đông';else if(t.includes('bãi trường'))n.zone='Bãi Trường';else if(/nam đảo|an thới|hòn thơm/.test(t))n.zone='Nam đảo';else if(/bắc đảo|gành dầu|bãi dài/.test(t))n.zone='Bắc đảo';
    n.staffHouse=/staff house|chỗ ở|nhà ở|lưu trú/.test(t);n.serviceCharge=/service charge|phí phục vụ/.test(t);n.shuttle=/shuttle|xe đưa đón|đưa rước/.test(t);n.meals=/bữa ăn|cơm ca|ăn ca|suất ăn/.test(t);n.urgent=/cần việc ngay|cần việc sớm|đi làm ngay|tuyển gấp/.test(t);n.noExperience=/không cần kinh nghiệm|chưa có kinh nghiệm|mới ra trường/.test(t);
    const s=t.match(/(?:lương\s*)?(?:từ\s*)?(\d{1,2})\s*triệu/);if(s)n.salaryMin=Number(s[1]);return n;
  }
  const need=parseNeed(needRaw);const good=[],watch=[],questions=[];
  if(need.department){job.department===need.department?good.push(`Đúng nhóm ${need.department}`):watch.push(`Bạn tìm ${need.department}, job này thuộc ${job.department||'nhóm khác'}`)}
  if(need.zone){(job.zone===need.zone||String(job.location||'').includes(need.zone))?good.push(`Đúng khu ${need.zone}`):watch.push(`Bạn ưu tiên ${need.zone}, job này ở ${job.zone||job.location||'khu khác'}`)}
  if(need.staffHouse){hasAcc(job)?good.push('Có thông tin hỗ trợ lưu trú'):watch.push('Staff house chưa được xác nhận')}
  if(need.serviceCharge){hasSvc(job)?good.push('Có thông tin service charge'):watch.push('Service charge chưa rõ')}
  if(need.shuttle){hasShuttle(job)?good.push('Có thông tin shuttle'):watch.push('Shuttle chưa rõ')}
  if(need.meals){hasMeals(job)?good.push('Có bữa ăn nhân viên'):watch.push('Bữa ăn chưa rõ')}
  if(need.urgent&&job.urgent)good.push('Đang tuyển gấp');
  if(need.salaryMin){const s=salaryValue(job.salary);if(s==null)watch.push('Lương chưa công khai');else if(s>=need.salaryMin)good.push(`Mức công khai từ ${s} triệu`);else watch.push(`Mức công khai dưới ${need.salaryMin} triệu bạn đang tìm`)}
  if(!job.salary)questions.push('Mức lương cơ bản và tổng package hiện tại là bao nhiêu?');
  if(job.serviceCharge==null&&!hasSvc(job))questions.push('Service charge trung bình hiện tại khoảng bao nhiêu?');
  if(job.staffHouse==null&&!hasAcc(job))questions.push('Có staff house hoặc hỗ trợ nhà ở không?');
  if(job.shuttle==null&&!hasShuttle(job))questions.push('Có xe đưa đón không, điểm đón và giờ chạy thế nào?');
  if(!job.offDays)questions.push('Một tháng có bao nhiêu ngày nghỉ?');
  if(!job.meals)questions.push('Ca làm có bữa ăn nhân viên không?');
  const anchor=document.querySelector('.detail-body .truth-note');if(!anchor)return;
  const box=document.createElement('section');box.className='job-decision-card';
  const needBlock=needRaw?`<div class="job-decision-need"><span>Bạn đã nói</span><strong>${esc(needRaw)}</strong></div>`:'<div class="job-decision-need"><span>Decision check</span><strong>Những gì nên biết trước khi ứng tuyển</strong></div>';
  const back=needRaw?`<a class="text-link" href="jobs.html?q=${encodeURIComponent(needRaw)}">← Quay lại các job theo nhu cầu này</a>`:'<a class="text-link" href="jobs.html">← Xem các việc đang tuyển</a>';
  box.innerHTML=`${needBlock}<div class="job-decision-grid"><div><span class="mini-label">Điểm đang khớp</span>${good.length?`<div class="decision-list good">${good.slice(0,5).map(x=>`<div>✓ ${esc(x)}</div>`).join('')}</div>`:'<div class="decision-empty">Chưa có đủ dữ liệu để nói job này khớp nhu cầu nào cụ thể.</div>'}</div><div><span class="mini-label">Cần để ý</span>${watch.length?`<div class="decision-list watch">${watch.slice(0,5).map(x=>`<div>? ${esc(x)}</div>`).join('')}</div>`:'<div class="decision-empty">Chưa thấy xung đột rõ với nhu cầu đã nhập.</div>'}</div></div><div class="job-question-block"><span class="mini-label">Có thể hỏi HR trước khi apply</span><div class="question-chips">${(questions.length?questions:['Các điều kiện chính đã có dữ liệu tương đối đầy đủ.']).slice(0,5).map(x=>`<span>${esc(x)}</span>`).join('')}</div></div><div class="job-decision-foot"><span>Đây là đối chiếu dữ liệu job với nhu cầu bạn nhập, không phải chấm điểm ứng viên.</span>${back}</div>`;
  anchor.insertAdjacentElement('afterend',box);
})();
