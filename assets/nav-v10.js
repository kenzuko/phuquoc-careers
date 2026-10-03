(function(){
  const body=document.body;if(!body)return;
  const page=body.dataset.page||'';
  const candidate=['home','jobs','job','careers','compare','life','employer-profile','island-now','employers-public'];
  if(!candidate.includes(page))return;

  /* Load the final nav/brand override once. */
  if(!document.querySelector('link[href="assets/nav-v12.css"]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='assets/nav-v12.css';document.head.appendChild(css);
  }

  /* The mark is a real cropped asset. Do not crop the stacked logo in CSS. */
  document.querySelectorAll('.brand-mark img').forEach(img=>{
    img.src='assets/logo-mark.jpg';img.alt='';img.setAttribute('aria-hidden','true');
  });

  /* Candidate utilities stay separate from the primary information architecture. */
  document.querySelectorAll('.ecosystem-utility').forEach(x=>x.remove());
  document.querySelectorAll('.employer-utility').forEach(a=>{
    a.href='employers.html';a.textContent='Nhà tuyển dụng';a.setAttribute('aria-label','Xem nhà tuyển dụng tại Phú Quốc');
  });
  document.querySelectorAll('.navlinks').forEach(nav=>{
    if(!nav.querySelector('a[href="life-in-phu-quoc.html"]')){
      const a=document.createElement('a');a.href='life-in-phu-quoc.html';a.textContent='Sống & làm việc';nav.appendChild(a);
    }
  });

  /* Remove the older shared popover and its listeners by replacing the two anchors. */
  document.querySelectorAll('.pqc-nav-popover,.pqc-nav-v12').forEach(x=>x.remove());
  const nav=document.querySelector('.navlinks');
  if(!nav||window.matchMedia('(max-width:760px)').matches)return;
  const refreshAnchor=href=>{
    const old=nav.querySelector(`a[href="${href}"]`);if(!old)return null;
    const fresh=old.cloneNode(true);fresh.removeAttribute('data-panel');fresh.removeAttribute('aria-haspopup');old.replaceWith(fresh);return fresh;
  };
  const career=refreshAnchor('careers.html');
  const life=refreshAnchor('life-in-phu-quoc.html');
  if(!career||!life)return;

  career.dataset.v12Menu='career';career.setAttribute('aria-haspopup','menu');career.setAttribute('aria-expanded','false');
  life.dataset.v12Menu='life';life.setAttribute('aria-haspopup','menu');life.setAttribute('aria-expanded','false');

  /* Useful anchors inside destination pages. */
  document.querySelector('.career-discovery-grid')?.setAttribute('id','career-groups');
  document.querySelector('.career-entry')?.setAttribute('id','current-role');
  const lifeItems=[...document.querySelectorAll('.life-guide-item')];
  if(lifeItems[0])lifeItems[0].id='housing';
  if(lifeItems[1])lifeItems[1].id='mobility';
  if(lifeItems[2])lifeItems[2].id='shifts';

  const menu=document.createElement('div');menu.className='pqc-nav-v12';menu.setAttribute('role','menu');document.body.appendChild(menu);
  const data={
    career:[
      ['careers.html#career-groups','Nhóm nghề đang có việc','Xem các nhóm nghề đang tuyển thật trong dữ liệu hiện tại.'],
      ['careers.html#current-role','Tôi đang làm nghề này','Nhập công việc hiện tại để xem những bước nghề thường gặp.'],
      ['careers.html?start=new','Tôi chưa biết bắt đầu đâu','Bắt đầu từ nhóm nghề, chưa cần biết chính xác chức danh.']
    ],
    life:[
      ['life-in-phu-quoc.html#housing','Chỗ ở & gói công việc','Staff house, bữa ăn, shuttle và những phần làm thay đổi giá trị một offer.'],
      ['life-in-phu-quoc.html#mobility','Đi lại & khu vực','Khoảng cách, ca muộn và cách về sau giờ làm.'],
      ['life-in-phu-quoc.html#shifts','Ca làm & nhịp sống','Ca gãy, ca đêm, ngày nghỉ và đời sống sau ca.'],
      ['phu-quoc-now.html','Phú Quốc ngay lúc này','Thời tiết, đi lại và nhịp đảo từ Open Phu Quoc.']
    ]
  };
  let owner=null,hideTimer=null;
  const close=()=>{
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>{
      menu.classList.remove('show');
      [career,life].forEach(a=>a.setAttribute('aria-expanded','false'));
      owner=null;
    },120);
  };
  const place=a=>{
    const r=a.getBoundingClientRect();
    const left=Math.min(Math.max(16,r.left),window.innerWidth-346);
    menu.style.left=`${left}px`;menu.style.top=`${Math.round(r.bottom+8)}px`;
  };
  const open=(kind,a)=>{
    clearTimeout(hideTimer);owner=a;
    [career,life].forEach(x=>x.setAttribute('aria-expanded',x===a?'true':'false'));
    menu.innerHTML=data[kind].map(([href,title,desc])=>`<a role="menuitem" href="${href}"><strong>${title}</strong><span>${desc}</span></a>`).join('');
    place(a);menu.classList.add('show');
  };
  [[career,'career'],[life,'life']].forEach(([a,kind])=>{
    a.addEventListener('mouseenter',()=>open(kind,a));
    a.addEventListener('focus',()=>open(kind,a));
    a.addEventListener('mouseleave',close);
  });
  menu.addEventListener('mouseenter',()=>clearTimeout(hideTimer));menu.addEventListener('mouseleave',close);
  window.addEventListener('resize',()=>{if(owner&&menu.classList.contains('show'))place(owner)});
  window.addEventListener('scroll',()=>{if(owner&&menu.classList.contains('show'))place(owner)},{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){clearTimeout(hideTimer);menu.classList.remove('show');[career,life].forEach(a=>a.setAttribute('aria-expanded','false'));owner=null}});
})();
