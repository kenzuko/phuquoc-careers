(function(){
  const page=document.body?.dataset?.page||'';
  const candidatePages=['home','jobs','job','careers','compare','life','employer-profile','island-now','employers-public','account'];
  if(!candidatePages.includes(page))return;
  if(!window.matchMedia('(max-width:760px)').matches || page==='job')return;

  const icon={
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M9 20v-6h6v6"/></svg>',
    jobs:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/></svg>',
    careers:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 18 5"/><path d="M10 5h8v8"/></svg>',
    life:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/><circle cx="12" cy="12" r="4.5"/></svg>'
  };
  const items=[
    ['home','index.html','Trang chủ'],
    ['jobs','jobs.html','Tìm việc'],
    ['careers','careers.html','Khám phá'],
    ['life','life-in-phu-quoc.html','Sống & làm việc']
  ];
  const active=page==='home'?'home':(page==='jobs'||page==='job'||page==='compare'||page==='employer-profile'||page==='employers-public')?'jobs':page==='careers'?'careers':(page==='life'||page==='island-now')?'life':'';
  document.querySelector('.pqc-mobile-nav')?.remove();
  const nav=document.createElement('nav');
  nav.className='pqc-mobile-nav';
  nav.setAttribute('aria-label','Điều hướng chính trên điện thoại');
  nav.innerHTML=items.map(([key,href,label])=>`<a href="${href}" class="${key===active?'active':''}"${key===active?' aria-current="page"':''}><span class="pqc-mobile-icon">${icon[key]}</span><span class="pqc-mobile-label">${label}</span></a>`).join('');
  document.body.appendChild(nav);
})();
