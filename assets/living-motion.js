(function(){
  const body=document.body;
  if(!body)return;

  const revealTargets=[
    '.needs-section','.market-raised','.main-section','.editorial-section','.life-section','.ecosystem-band',
    '.results-head','.results-layout','.detail-hero','.detail-shell','.career-hero','.career-main','.compare-hero','.compare-main',
    '.island-now-hero','.island-now-open'
  ];
  revealTargets.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.setAttribute('data-reveal','')));

  if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-in');io.unobserve(entry.target)}});
    },{threshold:.08,rootMargin:'0px 0px -5% 0px'});
    document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));
  }else{
    document.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('is-in'));
  }

  if(!document.querySelector('.pqc-footer')){
    const footer=document.createElement('footer');
    footer.className='pqc-footer';
    footer.innerHTML=`<div class="container pqc-footer-inner">
      <div class="pqc-footer-brand"><strong>PhuQuocCareers</strong><span>Việc làm, đường nghề và cuộc sống trên đảo.</span></div>
      <nav class="pqc-footer-links" aria-label="Liên kết cuối trang">
        <a href="jobs.html">Tìm việc</a>
        <a href="careers.html">Khám phá nghề</a>
        <a href="jobs.html?saved=1">Đã lưu</a>
        <a class="eco" href="phu-quoc-now.html">Phú Quốc ngay lúc này ↗</a>
      </nav>
    </div>`;
    body.appendChild(footer);
  }
})();