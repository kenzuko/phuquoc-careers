(function(){
  const body=document.body;if(!body)return;
  const page=body.dataset.page||'';
  const candidate=['home','jobs','job','careers','compare','life','employer-profile','island-now','employers-public'];
  if(!candidate.includes(page))return;

  if(!document.querySelector('link[href="assets/nav-v12.css"]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='assets/nav-v12.css';document.head.appendChild(css);
  }

  /* One brand lockup everywhere. The mark keeps its natural 420:176 ratio. */
  document.querySelectorAll('.brand-mark img').forEach(img=>{
    img.src='assets/logo-mark.jpg';img.alt='';img.setAttribute('aria-hidden','true');
  });

  /* Primary IA is intentionally only three destinations. */
  document.querySelectorAll('.navlinks').forEach(nav=>{
    const active=page==='careers'?'careers.html':(page==='life'||page==='island-now')?'life-in-phu-quoc.html':(page==='jobs'||page==='job'||page==='compare')?'jobs.html':'';
    nav.innerHTML=[
      ['jobs.html','Tìm việc'],
      ['careers.html','Khám phá nghề'],
      ['life-in-phu-quoc.html','Sống & làm việc']
    ].map(([href,label])=>`<a href="${href}"${href===active?' class="active"':''}>${label}</a>`).join('');
  });

  /* Utilities are separate from primary navigation. */
  document.querySelectorAll('.nav-actions').forEach(actions=>{
    actions.querySelectorAll('.ecosystem-utility').forEach(x=>x.remove());
    let saved=actions.querySelector('.saved-utility');
    if(!saved){saved=document.createElement('a');saved.className='btn saved-utility';actions.prepend(saved)}
    saved.href='jobs.html?saved=1';saved.textContent='♡ Đã lưu';saved.setAttribute('aria-label','Xem việc đã lưu');

    let employer=actions.querySelector('.employer-utility');
    if(!employer){employer=document.createElement('a');employer.className='btn employer-utility';actions.appendChild(employer)}
    employer.href='employers.html';employer.textContent='Nhà tuyển dụng';employer.setAttribute('aria-label','Xem nhà tuyển dụng tại Phú Quốc');
    employer.classList.toggle('active',page==='employers-public'||page==='employer-profile');

    let menu=actions.querySelector('.mobile-menu');
    if(!menu){menu=document.createElement('button');menu.type='button';menu.className='btn btn-icon mobile-menu';menu.setAttribute('aria-label','Mở tiện ích');menu.textContent='☰';actions.appendChild(menu)}
  });

  /* Kill every legacy/experimental dropdown. Destination pages own their functions. */
  document.querySelectorAll('.pqc-nav-popover,.pqc-nav-v12').forEach(x=>x.remove());
  document.querySelectorAll('.navlinks a').forEach(a=>{
    a.removeAttribute('data-panel');a.removeAttribute('data-v12-menu');a.removeAttribute('aria-haspopup');a.removeAttribute('aria-expanded');
  });

  /* The hamburger is utilities only, so it never duplicates the four bottom destinations. */
  const button=document.querySelector('.mobile-menu');
  if(button&&!document.querySelector('.pqc-mobile-sheet')){
    const backdrop=document.createElement('div');backdrop.className='pqc-mobile-sheet-backdrop';
    const sheet=document.createElement('aside');sheet.className='pqc-mobile-sheet';sheet.setAttribute('aria-label','Tiện ích');
    sheet.innerHTML=`<div class="pqc-mobile-sheet-head"><strong>PhuQuocCareers</strong><button type="button" aria-label="Đóng">×</button></div><nav><a href="jobs.html?saved=1"><strong>Việc đã lưu</strong><span>Những công việc bạn muốn xem lại.</span></a><a href="employers.html"><strong>Nhà tuyển dụng</strong><span>Biết nơi mình sắp làm việc trước khi ứng tuyển.</span></a><a href="phu-quoc-now.html"><strong>Phú Quốc ngay lúc này</strong><span>Thời tiết, đi lại và nhịp đảo từ Open Phu Quoc.</span></a><a class="hr-link" href="employer.html"><strong>Dành cho nhà tuyển dụng / HR</strong><span>Khu vực đăng tuyển và quản lý tuyển dụng.</span></a></nav>`;
    body.append(backdrop,sheet);
    const open=()=>{backdrop.classList.add('show');sheet.classList.add('show');body.classList.add('pqc-sheet-open');button.setAttribute('aria-expanded','true')};
    const close=()=>{backdrop.classList.remove('show');sheet.classList.remove('show');body.classList.remove('pqc-sheet-open');button.setAttribute('aria-expanded','false')};
    button.setAttribute('aria-expanded','false');button.addEventListener('click',open);backdrop.addEventListener('click',close);sheet.querySelector('button')?.addEventListener('click',close);sheet.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }

  /* Candidate-facing employer directory has the same footer rhythm even though it is lightweight. */
  if(page==='employers-public'&&!document.querySelector('.pqc-footer')){
    const f=document.createElement('footer');f.className='pqc-footer';
    f.innerHTML=`<div class="container pqc-footer-inner"><div class="pqc-footer-grid"><div class="pqc-footer-brand-block"><div class="pqc-footer-brand-lockup"><span class="pqc-footer-mark"></span><span class="pqc-footer-name"><strong>PHU QUOC</strong><span>CAREERS</span><small>by JoTrip</small></span></div><p>Việc làm, nghề và cuộc sống ở Phú Quốc. Chưa rõ thì để nguyên là chưa rõ.</p></div><div class="pqc-footer-col"><strong>Người tìm việc</strong><a href="jobs.html">Tìm việc</a><a href="careers.html">Khám phá nghề</a><a href="life-in-phu-quoc.html">Sống & làm việc</a><a href="jobs.html?saved=1">Việc đã lưu</a></div><div class="pqc-footer-col"><strong>Nhà tuyển dụng</strong><a href="employers.html">Hồ sơ nhà tuyển dụng</a><a href="employer.html">Dành cho HR</a></div><div class="pqc-footer-col"><strong>Hệ sinh thái</strong><a href="phu-quoc-now.html">Phú Quốc ngay lúc này</a><a href="https://openphuquoc.com" target="_blank" rel="noopener">Open Phu Quoc ↗</a></div></div><div class="pqc-footer-bottom"><span>PhuQuocCareers by JoTrip</span><span>Hiểu việc · hiểu nghề · hiểu đảo</span></div></div>`;
    body.appendChild(f);
  }
})();
