(function(){
  const jobs=window.PQC_JOBS||[];
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const catalog={
    'F&B':{label:'F&B Service',keys:['f&b','phục vụ','waiter','bartender','nhà hàng','restaurant','captain'],levels:['Waiter / Bartender','Captain','Supervisor','Assistant Manager'],desc:'Nhà hàng, bar, phục vụ khách và vận hành ca.'},
    'Front Office':{label:'Front Office',keys:['lễ tân','front office','reception','guest service','receptionist'],levels:['Agent / Receptionist','Supervisor','Duty Manager','Front Office Manager'],desc:'Đón khách, hỗ trợ khách và vận hành tiền sảnh.'},
    'Housekeeping':{label:'Housekeeping',keys:['housekeeping','buồng phòng','room attendant','attendant'],levels:['Room Attendant','Supervisor','Assistant Manager','Housekeeping Manager'],desc:'Buồng phòng, tiêu chuẩn sạch và chất lượng lưu trú.'},
    'Reservations':{label:'Reservations',keys:['reservation','đặt phòng'],levels:['Reservations Agent','Senior Agent','Supervisor','Reservations Manager'],desc:'Booking, giá phòng và trao đổi với khách trước khi đến.'},
    'Spa & Wellness':{label:'Spa & Wellness',keys:['spa','wellness','therapist'],levels:['Therapist / Attendant','Senior / Team Leader','Supervisor','Spa Manager'],desc:'Trị liệu, chăm sóc cá nhân và vận hành spa.'},
    'Kỹ thuật':{label:'Kỹ thuật',keys:['kỹ thuật','engineering','bảo trì','maintenance'],levels:['Technician','Senior Technician','Supervisor','Chief Engineer'],desc:'Bảo trì và vận hành hệ thống kỹ thuật của property.'},
    'Sales & Marketing':{label:'Sales & Marketing',keys:['sales','marketing','kinh doanh'],levels:['Coordinator / Executive','Senior Executive','Assistant Manager','Manager'],desc:'Kinh doanh, đối tác, nội dung và truyền thông.'},
    'Nhân sự':{label:'Nhân sự',keys:['nhân sự','human resources','hr','people & culture'],levels:['Coordinator','Executive','Assistant Manager','HR Manager'],desc:'Tuyển dụng, hồ sơ và vận hành nhân sự.'}
  };
  function detect(text=''){const t=text.toLowerCase();for(const [dep,c] of Object.entries(catalog)){if(c.keys.some(k=>t.includes(k)))return dep}return ''}
  function counts(dep){const rows=jobs.filter(j=>j.department===dep),fresh=rows.filter(j=>j.fresh).length,zones={};rows.forEach(j=>{const z=j.zone||'Khác';zones[z]=(zones[z]||0)+1});const topZone=Object.entries(zones).sort((a,b)=>b[1]-a[1])[0]?.[0]||'Chưa rõ';return {total:rows.length,fresh,topZone}}
  function market(){const deps={};jobs.forEach(j=>deps[j.department]=(deps[j.department]||0)+1);const top=Object.entries(deps).sort((a,b)=>b[1]-a[1])[0];const fresh=jobs.filter(j=>j.fresh).length;const vals={careerMarketJobs:fresh,careerMarketGroups:Object.keys(deps).length,careerMarketTop:top?`${top[0]} · ${top[1]} việc`:'Chưa có dữ liệu'};Object.entries(vals).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v})}
  function levelIndex(text='',levels=[]){const t=text.toLowerCase();if(/manager|quản lý|trưởng/.test(t))return Math.min(levels.length-1,3);if(/supervisor|giám sát|captain|team leader|tổ trưởng/.test(t))return Math.min(levels.length-1,2);if(/senior/.test(t))return Math.min(levels.length-1,1);return 0}
  function renderSide(dep){const side=$('#careerSideList');if(!side)return;const examples=jobs.filter(j=>j.department===dep).slice(0,4);side.innerHTML=examples.length?examples.map(j=>`<a class="career-side-item" href="job.html?id=${encodeURIComponent(j.id)}"><strong>${esc(j.title)}</strong><span>${esc(j.zone||j.location||'Phú Quốc')} · ${j.fresh?'Nguồn vừa kiểm tra':'Cần kiểm tra lại'}</span></a>`).join(''):'<div class="career-side-item"><strong>Chưa thấy việc đang mở trong dữ liệu hiện tại</strong><span>Không có ở đây không có nghĩa ngoài thị trường không tuyển.</span></div>'}
  function render(dep,text=''){
    const sheet=$('#careerSheet');if(!sheet)return;
    const c=catalog[dep];if(!c){sheet.innerHTML=`<div class="career-empty"><strong>Chưa nhận ra nhóm nghề này.</strong><span>Thử tên gần với công việc như lễ tân, phục vụ, housekeeping, spa hoặc kỹ thuật.</span></div>`;return}
    const hasCurrent=Boolean(text.trim());
    const idx=hasCurrent?levelIndex(text,c.levels):0;
    const m=counts(dep);
    const route=c.levels.map((level,i)=>`<div class="career-route-item ${hasCurrent&&i===idx?'current':''}"><small>${hasCurrent&&i===idx?'Bạn đang làm':'Vị trí thường gặp'}</small><strong>${esc(level)}</strong></div>`).join('<span class="career-route-arrow">→</span>');
    sheet.innerHTML=`<div class="career-sheet-head"><div class="eyebrow">${esc(c.label)}</div><h2>${hasCurrent?'Từ công việc hiện tại, có thể nhìn những vị trí thường gặp tiếp theo.':`Một đường đi thường gặp trong ${esc(c.label)}.`}</h2><p>${esc(c.desc)} Đây chỉ là cách để hiểu tên các vị trí trong nghề, không phải lộ trình bắt buộc.</p></div><div class="career-route-simple">${route}</div><div class="career-route-note">Bạn có thể đổi resort, chuyển ngang hoặc đi theo hướng khác. PhuQuocCareers không chấm năng lực và không hứa thăng tiến.</div><div class="career-evidence"><div><small>Việc đang mở trong dữ liệu</small><strong>${m.total}</strong></div><div><small>Nguồn vừa kiểm tra</small><strong>${m.fresh}</strong></div><div><small>Khu vực xuất hiện nhiều</small><strong>${esc(m.topZone)}</strong></div></div><div class="career-actions"><a class="btn btn-primary" href="jobs.html?dept=${encodeURIComponent(dep)}">Xem việc ${esc(c.label)} đang mở →</a><a class="btn btn-soft" href="jobs.html">Xem tất cả việc</a></div>`;
    $$('.career-quick button').forEach(b=>b.classList.toggle('active',b.dataset.career===dep));renderSide(dep)
  }
  function showWelcome(){const sheet=$('#careerSheet');if(sheet)sheet.innerHTML='<div class="career-welcome"><div class="eyebrow">Bắt đầu ở đây</div><h2>Chọn một nghề ở phía trên.</h2><p>Bạn sẽ thấy nghề đó thường làm gì, những vị trí thường gặp và việc nào đang mở ở Phú Quốc. Nếu đã có kinh nghiệm, nhập công việc hiện tại để xem từ đúng chỗ của bạn.</p></div>';const side=$('#careerSideList');if(side)side.innerHTML='<div class="career-side-item"><strong>Chưa chọn nghề</strong><span>Chọn một nhóm nghề để xem các vị trí đang mở.</span></div>'}
  function choose(dep){render(dep,'')}
  market();
  $$('.career-quick button').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.career)));
  $('#careerGo')?.addEventListener('click',()=>{const text=$('#currentRole')?.value.trim()||'',dep=detect(text);render(dep,text)});
  $('#currentRole')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const text=e.currentTarget.value.trim(),dep=detect(text);render(dep,text)}});
  $('#careerNew')?.addEventListener('click',()=>{location.href='jobs.html?q='+encodeURIComponent('Tôi chưa có kinh nghiệm')});
  showWelcome();
})();