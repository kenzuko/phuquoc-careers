(function(){
  const jobs=window.PQC_JOBS||[];
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const params=new URLSearchParams(location.search);const name=(params.get('name')||'').trim();
  const head=document.getElementById('employerProfileHead'),about=document.getElementById('employerAbout'),trust=document.getElementById('employerTrust'),list=document.getElementById('employerJobs'),side=document.getElementById('employerSide');
  if(!name){head.innerHTML='<div class="employer-avatar">?</div><div><div class="eyebrow">Nhà tuyển dụng</div><h1>Chưa chọn nhà tuyển dụng</h1><p>Quay lại danh sách việc và chọn tên nhà tuyển dụng để xem hồ sơ.</p></div>';about.innerHTML='<a class="btn btn-primary" href="jobs.html">Tìm việc →</a>';return}
  const rows=jobs.filter(j=>String(j.employer||'').trim()===name);
  if(!rows.length){head.innerHTML=`<div class="employer-avatar">?</div><div><div class="eyebrow">Nhà tuyển dụng</div><h1>${esc(name)}</h1><p>Chưa có đủ dữ liệu để tạo hồ sơ nhà tuyển dụng này.</p></div><span class="verify-badge pending">Chưa xác minh</span>`;about.innerHTML='<p>PhuQuocCareers chưa có vị trí tuyển dụng đủ dữ liệu để đối chiếu hồ sơ này.</p>';return}
  const operator=[...new Set(rows.map(j=>j.operator).filter(Boolean))][0]||'';
  const zones=[...new Set(rows.map(j=>j.zone||j.location).filter(Boolean))];
  const departments=[...new Set(rows.map(j=>j.department).filter(Boolean))];
  const direct=rows.some(j=>j.verifiedByEmployer===true);
  const official=rows.every(j=>/official/i.test(j.sourceType||''));
  const checks=rows.map(j=>j.lastChecked).filter(Boolean);
  const latest=checks[0]||'Chưa rõ';
  const sources=[...new Map(rows.filter(j=>j.sourceUrl).map(j=>[j.sourceUrl,{url:j.sourceUrl,type:j.sourceType||'Nguồn tuyển dụng'}])).values()];
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  document.title=`${name} - PhuQuocCareers`;
  head.innerHTML=`<div class="employer-avatar">${esc(initials||'PQ')}</div><div><div class="eyebrow">Nhà tuyển dụng</div><h1>${esc(name)}</h1><p>${operator?`Vận hành bởi ${esc(operator)} · `:''}${esc(zones.join(' · ')||'Phú Quốc')}</p></div><span class="verify-badge ${direct?'direct':'pending'}">${direct?'✓ Đã xác minh trực tiếp':'○ Chưa xác minh trực tiếp'}</span>`;
  about.innerHTML=`<h2>Thông tin đang có</h2><p>Hồ sơ này được tạo từ những vị trí tuyển dụng mà PhuQuocCareers đang theo dõi. Chỗ nào chưa có nguồn thì không tự điền thêm.</p><div class="employer-facts"><div class="employer-fact"><small>Vị trí đang mở</small><strong>${rows.length}</strong></div><div class="employer-fact"><small>Nhóm nghề</small><strong>${esc(departments.join(' · ')||'Chưa rõ')}</strong></div><div class="employer-fact"><small>Khu vực</small><strong>${esc(zones.join(' · ')||'Phú Quốc')}</strong></div><div class="employer-fact"><small>Kiểm tra gần nhất</small><strong>${esc(latest)}</strong></div></div>`;
  trust.innerHTML=`<h2>Tình trạng xác minh</h2><p>${direct?'Nhà tuyển dụng đã xác nhận trực tiếp hồ sơ hoặc dữ liệu tuyển dụng với PhuQuocCareers.':official?'Các vị trí hiện có được lấy từ nguồn tuyển dụng chính thức đã đối chiếu, nhưng nhà tuyển dụng chưa xác nhận hồ sơ này trực tiếp với PhuQuocCareers.':'PhuQuocCareers có dữ liệu tuyển dụng để đối chiếu, nhưng chưa có xác nhận trực tiếp từ nhà tuyển dụng.'}</p>`;
  list.innerHTML=rows.map(j=>`<a class="employer-job-item" href="job.html?id=${encodeURIComponent(j.id)}"><div><strong>${esc(j.title)}</strong><span>${esc(j.department||'')} ${j.zone?`· ${esc(j.zone)}`:''}</span></div><span>→</span></a>`).join('');
  side.innerHTML=`<h3>Nguồn đang đối chiếu</h3><p style="margin:0 0 12px;color:#71828d;font-size:13px">${official?'Nguồn tuyển dụng chính thức':'Nguồn tuyển dụng đang có trong hệ thống'}</p>${sources.map(s=>`<a class="employer-source-link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.type)} ↗</a>`).join('')||'<span>Chưa có link nguồn công khai.</span>'}<div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(18,59,86,.11)"><a class="btn btn-soft" href="jobs.html">Xem các việc khác</a></div>`;
})();
