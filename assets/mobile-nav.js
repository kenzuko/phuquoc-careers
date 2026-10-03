(function(){
  const page=document.body?.dataset?.page||'';
  const candidatePages=['home','jobs','job','careers','compare'];
  if(!candidatePages.includes(page))return;

  // Keep only the two primary journeys in top navigation.
  const navlinks=document.querySelector('.navlinks');
  if(navlinks){
    [...navlinks.querySelectorAll('a')].forEach(a=>{
      const href=a.getAttribute('href')||'';
      if(href.startsWith('jobs.html?saved')||href==='compare.html') a.remove();
      if(href==='careers.html') a.textContent='Khám phá nghề';
    });
  }

  // Saved jobs remain available as a compact utility, not a primary journey.
  const actions=document.querySelector('.nav-actions');
  if(actions && !actions.querySelector('.pqc-saved-shortcut')){
    const saved=document.createElement('a');
    saved.className='pqc-saved-shortcut';
    saved.href='jobs.html?saved=1';
    saved.setAttribute('aria-label','Việc đã lưu');
    saved.title='Việc đã lưu';
    saved.innerHTML='<span aria-hidden="true">♡</span><b>Đã lưu</b>';
    actions.prepend(saved);
  }

  // A lighter, warmer close to the page instead of a heavy dark block.
  if(!document.querySelector('.pqc-footer')){
    const footer=document.createElement('footer');
    footer.className='pqc-footer';
    footer.innerHTML=`
      <div class="container pqc-footer-inner">
        <div class="pqc-footer-lead">
          <div class="pqc-footer-mark">PQC</div>
          <div>
            <strong>Phu Quoc Careers <span>by JoTrip</span></strong>
            <p>Một công việc tốt không chỉ nằm ở mức lương.</p>
          </div>
        </div>
        <nav class="pqc-footer-links" aria-label="Liên kết cuối trang">
          <a href="jobs.html">Tìm việc</a>
          <a href="careers.html">Khám phá nghề</a>
          <a href="employer/post.html">Dành cho nhà tuyển dụng</a>
        </nav>
        <div class="pqc-footer-note">Phú Quốc · Việc làm · Cuộc sống trên đảo</div>
      </div>`;
    document.body.appendChild(footer);
  }

  if(!window.matchMedia('(max-width:760px)').matches || page==='job')return;

  const items=[
    ['home','index.html','⌂','Trang chủ'],
    ['jobs','jobs.html','⌕','Tìm việc'],
    ['careers','careers.html','↗','Khám phá nghề']
  ];
  const active=page==='home'?'home':page==='jobs'?'jobs':page==='careers'?'careers':'';
  const nav=document.createElement('nav');
  nav.className='pqc-mobile-nav';
  nav.setAttribute('aria-label','Điều hướng mobile');
  nav.innerHTML=items.map(([key,href,ico,label])=>`<a href="${href}" class="${key===active?'active':''}"><span>${ico}</span><span>${label}</span></a>`).join('');
  document.body.appendChild(nav);
})();