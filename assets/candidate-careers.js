(function(){
  const jobs=window.PQC_JOBS||[];
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const catalog={
    'F&B':{label:'F&B Service',keys:['f&b','phục vụ','waiter','bartender','nhà hàng','restaurant','captain'],levels:['Waiter / Bartender','Captain','Supervisor','Assistant Manager'],desc:'Dịch vụ nhà hàng, bar và phục vụ khách.'},
    'Front Office':{label:'Front Office',keys:['lễ tân','front office','reception','guest service','receptionist'],levels:['Agent / Receptionist','Supervisor','Duty Manager','Front Office Manager'],desc:'Tiếp đón, hỗ trợ khách và vận hành tiền sảnh.'},
    'Housekeeping':{label:'Housekeeping',keys:['housekeeping','buồng phòng','room attendant','attendant'],levels:['Room Attendant','Supervisor','Assistant Manager','Housekeeping Manager'],desc:'Vận hành phòng, tiêu chuẩn sạch và chất lượng lưu trú.'},
    'Reservations':{label:'Reservations',keys:['reservation','đặt phòng'],levels:['Reservations Agent','Senior Agent','Supervisor','Reservations Manager'],desc:'Quản lý booking, giá và trao đổi trước khi khách đến.'},
    'Spa & Wellness':{label:'Spa & Wellness',keys:['spa','wellness','therapist'],levels:['Therapist / Attendant','Senior / Team Leader','Supervisor','Spa Manager'],desc:'Dịch vụ cá nhân, trị liệu và wellness.'},
    'Kỹ thuật':{label:'Kỹ thuật',keys:['kỹ thuật','engineering','bảo trì','maintenance'],levels:['Technician','Senior Technician','Supervisor','Chief Engineer'],desc:'Bảo trì, vận hành kỹ thuật và hệ thống property.'},
    'Sales & Marketing':{label:'Sales & Marketing',keys:['sales','marketing','kinh doanh'],levels:['Coordinator / Executive','Senior Executive','Assistant Manager','Manager'],desc:'Kinh doanh, đối tác và truyền thông.'},
    'Nhân sự':{label:'Nhân sự',keys:['nhân sự','human resources','hr','people & culture'],levels:['Coordinator','Executive','Assistant Manager','HR Manager'],desc:'Tuyển dụng, hồ sơ và vận hành nhân sự.'}
  };
  function detect(text=''){const t=text.toLowerCase();for(const [dep,c] of Object.entries(catalog)){if(c.keys.some(k=>t.includes(k)))return dep}return ''}
  function counts(dep){const rows=jobs.filter(j=>j.department===dep),fresh=rows.filter(j=>j.fresh).length,zones={};rows.forEach(j=>{const z=j.zone||'Khác';zones[z]=(zones[z]||0)+1});const topZone=Object.entries(zones).sort((a,b)=>b[1]-a[1])[0]?.[0]||'Chưa rõ';return {total:rows.length,fresh,topZone}}
  function market(){const deps={};jobs.forEach(j=>deps[j.department]=(deps[j.department]||0)+1);const top=Object.entries(deps).sort((a,b)=>b[1]-a[1])[0];const fresh=jobs.filter(j=>j.fresh).length;const vals={careerMarketJobs:fresh,careerMarketGroups:Object.keys(deps).length,careerMarketTop:top?`${top[0]} · ${top[1]} việc`:'Chưa có dữ liệu'};Object.entries(vals).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v})}
  function levelIndex(text='',levels=[]){const t=text.toLowerCase();if(/manager|quản lý|trưởng/.test(t))return Math.min(levels.length-1,3);if(/supervisor|giám sát|captain|team leader|tổ trưởng/.test(t))return Math.min(levels.length-1,2);if(/senior/.test(t))return Math.min(levels.length-1,1);return 0}
  function render(dep,text=''){
    const sheet=$('#careerSheet');if(!sheet)return;
    const c=catalog[dep];if(!c){sheet.innerHTML=`<div class="career-empty"><strong>Chưa nhận ra nhóm nghề này.</strong><span>Thử tên gần với công việc hiện tại như lễ tân, phục vụ, housekeeping, spa, kỹ thuật...</span></div>`;return}
    const idx=levelIndex(text,c.levels),m=counts(dep),path=c.levels.map((level,i)=>`<div class="career-step ${i===idx?'current':i===idx+1?'next':''}"><small>${i===idx?'Bạn đang ở đây':i===idx+1?'Bước gần nhất':`Bước ${i+1}`}</small><strong>${esc(level)}</strong><span>${i===idx?'Mốc hiện tại theo mô tả bạn nhập.':i===idx+1?'Một hướng phát triển gần, không phải lộ trình bắt buộc.':'Lộ trình tham khảo trong nhóm nghề.'}</span></div>`).join('');
    sheet.innerHTML=`<div class="career-sheet-head"><div class="eyebrow">${esc(c.label)}</div><h2>Từ công việc hiện tại, bạn có thể nhìn đường đi tiếp rõ hơn</h2><p>${esc(c.desc)} Lộ trình dưới đây chỉ để định hướng, không phải cam kết thăng tiến.</p></div><div class="career-path">${path}</div><div class="career-evidence"><div><small>Việc đang có trong dữ liệu</small><strong>${m.total}</strong></div><div><small>Nguồn vừa được kiểm tra</small><strong>${m.fresh}</strong></div><div><small>Khu vực xuất hiện nhiều</small><strong>${esc(m.topZone)}</strong></div></div><div class="career-actions"><a class="btn btn-primary" href="jobs.html?dept=${encodeURIComponent(dep)}">Xem việc ${esc(c.label)} đang có →</a><a class="btn btn-soft" href="jobs.html">Xem toàn bộ việc</a></div>`;
    $$('.career-quick button').forEach(b=>b.classList.toggle('active',b.dataset.career===dep));
    const side=$('#careerSideList');if(side){const examples=jobs.filter(j=>j.department===dep).slice(0,4);side.innerHTML=examples.length?examples.map(j=>`<a class="career-side-item" href="job.html?id=${encodeURIComponent(j.id)}"><strong>${esc(j.title)}</strong><span>${esc(j.zone||j.location||'Phú Quốc')} · ${j.fresh?'Nguồn vừa kiểm tra':'Cần kiểm tra lại'}</span></a>`).join(''):'<div class="career-side-item"><strong>Chưa có job đang hiện</strong><span>Không có nghĩa ngoài thị trường không tuyển.</span></div>'}
  }
  function choose(dep){const input=$('#currentRole');if(input&&!input.value.trim())input.value=catalog[dep]?.label||dep;render(dep,input?.value||'')}
  market();
  $$('.career-quick button').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.career)));
  $('#careerGo')?.addEventListener('click',()=>{const text=$('#currentRole')?.value.trim()||'',dep=detect(text);render(dep,text)});
  $('#currentRole')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const text=e.currentTarget.value.trim(),dep=detect(text);render(dep,text)}});
  $('#careerNew')?.addEventListener('click',()=>{location.href='jobs.html?q='+encodeURIComponent('Tôi chưa có kinh nghiệm')});
  const first=Object.keys(catalog).find(dep=>jobs.some(j=>j.department===dep))||'F&B';render(first,'');
})();