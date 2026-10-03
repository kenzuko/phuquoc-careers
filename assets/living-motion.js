(function(){
  const body=document.body;
  if(!body)return;

  if(!document.querySelector('link[data-v6-pages]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='assets/candidate-v6-pages.css';
    link.dataset.v6Pages='true';
    document.head.appendChild(link);
  }

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