(function(){
  const body=document.body;if(!body)return;
  const candidate=['home','jobs','job','careers','compare','life','employer-profile','island-now','employers-public'];
  if(!candidate.includes(body.dataset.page||''))return;
  document.querySelectorAll('.ecosystem-utility').forEach(x=>x.remove());
  document.querySelectorAll('.employer-utility').forEach(a=>{a.href='employers.html';a.textContent='Nhà tuyển dụng';a.setAttribute('aria-label','Xem nhà tuyển dụng tại Phú Quốc')});
  document.querySelectorAll('.navlinks').forEach(nav=>{
    if(!nav.querySelector('a[href="life-in-phu-quoc.html"]')){const a=document.createElement('a');a.href='life-in-phu-quoc.html';a.textContent='Sống & làm việc';nav.appendChild(a)}
  });
})();