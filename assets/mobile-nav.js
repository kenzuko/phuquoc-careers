(function(){
  const page=document.body?.dataset?.page||'';
  const candidatePages=['home','jobs','job','careers','compare','life','employer-profile','island-now'];
  if(!candidatePages.includes(page))return;
  if(!window.matchMedia('(max-width:760px)').matches || page==='job')return;

  const items=[
    ['home','index.html','⌂','Trang chủ'],
    ['jobs','jobs.html','⌕','Tìm việc'],
    ['careers','careers.html','↗','Khám phá'],
    ['life','life-in-phu-quoc.html','☀','Sống ở PQ']
  ];
  const active=page==='home'?'home':page==='jobs'?'jobs':page==='careers'?'careers':page==='life'?'life':'';
  const nav=document.createElement('nav');
  nav.className='pqc-mobile-nav';
  nav.setAttribute('aria-label','Điều hướng mobile');
  nav.innerHTML=items.map(([key,href,ico,label])=>`<a href="${href}" class="${key===active?'active':''}"><span>${ico}</span><span>${label}</span></a>`).join('');
  document.body.appendChild(nav);
})();
