(function(){
  const jobs=window.PQC_JOBS||[];
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const params=new URLSearchParams(location.search);const name=(params.get('name')||'').trim();
  const head=document.getElementById('employerProfileHead'),about=document.getElementById('employerAbout'),trust=document.getElementById('employerTrust'),list=document.getElementById('employerJobs'),side=document.getElementById('employerSide');

  const publicInfo=[
    {match:n=>/InterContinental Phu Quoc Long Beach Resort/i.test(n),website:'https://www.ihg.com/intercontinental/hotels/vn/vi/phu-quoc/pqccp/hoteldetail',careers:'https://careers.ihg.com/en/search-and-apply/?area=vietnam&businessarea=&formtype=qs',phone:'+84 297 397 8888',email:'reservations.icpq@ihg.com',address:'Phu Quoc Marina Integrated Resort Complex, Dương Bào, Phú Quốc',contactKind:'Liên hệ chung của resort',contactNote:'Số điện thoại và email lấy từ website chính thức của InterContinental. Đây là liên hệ chung, không mặc định là kênh tuyển dụng.'},
    {match:n=>/RIXOS PHU QUOC/i.test(n),website:'https://all.accor.com/hotel/C428/index.en.shtml',careers:'https://careers.accor.com/global/en/vietnam',phone:'+84 889 898 607',email:'reservations.phuquoc@rixos.com',address:'An Thới - Hòn Thơm, Phú Quốc',contactKind:'Liên hệ chung của resort',contactNote:'Số điện thoại và email lấy từ website chính thức của Rixos/Accor. Đây là liên hệ chung, không mặc định là kênh tuyển dụng.'},
    {match:n=>/Moxy Phu Quoc Hon Thom/i.test(n),website:'https://www.marriott.com/vi/hotels/pqcox-moxy-phu-quoc-hon-thom/overview/',careers:'https://careers.marriott.com/',address:'Đại lộ Đông Tây Hòn Thơm, Hòn Thơm, Phú Quốc',contactKind:'Trang chính thức',contactNote:'Trang property chính thức của Marriott hiện chưa công bố số điện thoại trên trang khách sạn.'},
    {match:n=>/Phu Quoc Marriott Resort & Spa/i.test(n),website:'https://www.marriott.com/marriott-brands/portfolio/openings',careers:'https://careers.marriott.com/',contactKind:'Trang Marriott chính thức',contactNote:'Các vị trí đang được đối chiếu từ Marriott Careers. PhuQuocCareers không tự điền số điện thoại hoặc email tuyển dụng khi chưa thấy nguồn chính thức.'},
    {match:n=>/W Phu Quoc/i.test(n),website:'https://www.marriott.com/marriott-brands/portfolio/openings',careers:'https://careers.marriott.com/',contactKind:'Trang Marriott chính thức',contactNote:'Các vị trí đang được đối chiếu từ Marriott Careers. PhuQuocCareers không tự điền số điện thoại hoặc email tuyển dụng khi chưa thấy nguồn chính thức.'}
  ];
  const info=publicInfo.find(x=>x.match(name))||null;

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

  about.innerHTML=`<h2>Nhìn nhanh trước khi ứng tuyển</h2><p>Thông tin dưới đây được gom từ các vị trí đang mở và nguồn chính thức mà PhuQuocCareers đang theo dõi.</p><div class="employer-facts"><div class="employer-fact"><small>Việc đang mở</small><strong>${rows.length}</strong></div><div class="employer-fact"><small>Nhóm nghề</small><strong>${esc(departments.join(' · ')||'Chưa rõ')}</strong></div><div class="employer-fact"><small>Khu vực</small><strong>${esc(zones.join(' · ')||'Phú Quốc')}</strong></div><div class="employer-fact"><small>Kiểm tra gần nhất</small><strong>${esc(latest)}</strong></div></div>`;

  trust.innerHTML=`<h2>Thông tin này đã được xác minh tới đâu?</h2><p>${direct?'Nhà tuyển dụng đã xác nhận trực tiếp hồ sơ hoặc dữ liệu tuyển dụng với PhuQuocCareers.':official?'Các vị trí hiện có được lấy từ nguồn tuyển dụng chính thức đã đối chiếu, nhưng nhà tuyển dụng chưa xác nhận hồ sơ này trực tiếp với PhuQuocCareers.':'PhuQuocCareers có dữ liệu tuyển dụng để đối chiếu, nhưng chưa có xác nhận trực tiếp từ nhà tuyển dụng.'}</p><div class="employer-trust-stack"><div class="employer-trust-line"><span class="employer-trust-dot ${official?'official':'pending'}"></span><div><b>${official?'Nguồn tuyển dụng chính thức đã đối chiếu':'Nguồn đang được đối chiếu'}</b><br>${official?'Các job đang hiển thị có nguồn chính thức trong dữ liệu hiện tại.':'Không gắn nhãn chính thức nếu chưa đủ bằng chứng.'}</div></div><div class="employer-trust-line"><span class="employer-trust-dot ${direct?'direct':'pending'}"></span><div><b>${direct?'Đã xác minh trực tiếp với PhuQuocCareers':'Chưa xác minh trực tiếp với PhuQuocCareers'}</b><br>${direct?'Doanh nghiệp đã xác nhận trực tiếp.':'Nguồn chính thức không đồng nghĩa doanh nghiệp đã xác nhận hồ sơ này với PhuQuocCareers.'}</div></div></div>`;

  list.innerHTML=rows.map(j=>`<a class="employer-job-item" href="job.html?id=${encodeURIComponent(j.id)}"><div><strong>${esc(j.title)}</strong><span>${esc(j.department||'')} ${j.zone?`· ${esc(j.zone)}`:''}</span></div><span>→</span></a>`).join('');

  const contact=info?`<div class="employer-contact-block"><h3>Liên hệ & trang chính thức</h3>${info.address?`<div class="employer-contact-row"><span>Địa điểm</span><strong>${esc(info.address)}</strong></div>`:''}${info.phone?`<div class="employer-contact-row"><span>Điện thoại</span><a href="tel:${esc(info.phone.replace(/\s/g,''))}">${esc(info.phone)}</a></div>`:''}${info.email?`<div class="employer-contact-row"><span>Email</span><a href="mailto:${esc(info.email)}">${esc(info.email)}</a></div>`:''}<div class="employer-contact-row"><span>Loại liên hệ</span><strong>${esc(info.contactKind||'Thông tin chính thức')}</strong></div><div class="employer-contact-actions">${info.website?`<a class="primary" href="${esc(info.website)}" target="_blank" rel="noopener">Website chính thức ↗</a>`:''}${info.careers?`<a href="${esc(info.careers)}" target="_blank" rel="noopener">Trang tuyển dụng ↗</a>`:''}</div>${info.contactNote?`<div class="employer-contact-note">${esc(info.contactNote)}</div>`:''}</div>`:'';

  side.innerHTML=`<h3>Nguồn đang đối chiếu</h3><p style="margin:0 0 12px;color:#71828d;font-size:13px">${official?'Nguồn tuyển dụng chính thức':'Nguồn tuyển dụng đang có trong hệ thống'}</p>${sources.map(s=>`<a class="employer-source-link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.type)} ↗</a>`).join('')||'<span>Chưa có link nguồn công khai.</span>'}${contact}<div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(18,59,86,.11)"><a class="btn btn-soft" href="jobs.html">Xem các việc khác</a></div>`;
})();
