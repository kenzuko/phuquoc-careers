(function(){
  const body=document.body;if(!body)return;
  const page=body.dataset.page||'';
  const candidatePages=['home','jobs','job','careers','compare','life','employer-profile','island-now'];
  if(!candidatePages.includes(page))return;

  function ensureNav(){
    document.querySelectorAll('.navlinks').forEach(nav=>{
      const links=[...nav.querySelectorAll('a')];
      links.forEach(a=>{if(a.getAttribute('href')==='careers.html')a.textContent='Khám phá nghề'});
      if(!nav.querySelector('a[href="life-in-phu-quoc.html"]')){
        const a=document.createElement('a');a.href='life-in-phu-quoc.html';a.textContent='Sống & làm việc';
        if(page==='life')a.classList.add('active');nav.appendChild(a);
      }
    });
    document.querySelectorAll('.nav-actions').forEach(actions=>{
      if(!actions.querySelector('.ecosystem-utility')){
        const eco=document.createElement('a');eco.className='ecosystem-utility';eco.href='phu-quoc-now.html';eco.textContent='Phú Quốc lúc này ↗';actions.prepend(eco);
      }
      const employer=actions.querySelector('.employer-utility');if(employer)employer.textContent='Nhà tuyển dụng →';
    });
  }

  function heroSlider(){
    const hero=document.querySelector('.hero-home');if(!hero||hero.querySelector('.hero-slides'))return;
    const images=[
      'https://images.pexels.com/photos/17277141/pexels-photo-17277141.jpeg?auto=compress&cs=tinysrgb&w=2400',
      'https://images.pexels.com/photos/17748657/pexels-photo-17748657.jpeg?auto=compress&cs=tinysrgb&w=2400',
      'https://images.pexels.com/photos/14024057/pexels-photo-14024057.jpeg?auto=compress&cs=tinysrgb&w=2400',
      'https://images.pexels.com/photos/6481615/pexels-photo-6481615.jpeg?auto=compress&cs=tinysrgb&w=2400'
    ];
    const wrap=document.createElement('div');wrap.className='hero-slides';
    images.forEach((src,i)=>{const s=document.createElement('div');s.className='hero-slide'+(i===0?' is-active':'');s.style.backgroundImage=`url('${src}')`;wrap.appendChild(s)});
    hero.prepend(wrap);
    const dots=document.createElement('div');dots.className='hero-slider-dots';
    images.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className='hero-slider-dot'+(i===0?' is-active':'');b.setAttribute('aria-label',`Ảnh ${i+1}`);b.dataset.index=i;dots.appendChild(b)});hero.appendChild(dots);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let current=0,timer;
    const show=i=>{const slides=[...wrap.children],ds=[...dots.children];slides[current]?.classList.remove('is-active');ds[current]?.classList.remove('is-active');current=i%slides.length;slides[current]?.classList.add('is-active');ds[current]?.classList.add('is-active')};
    const play=()=>{clearInterval(timer);timer=setInterval(()=>show((current+1)%images.length),7000)};
    dots.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;show(Number(b.dataset.index));play()});
    hero.addEventListener('mouseenter',()=>clearInterval(timer));hero.addEventListener('mouseleave',play);play();
  }

  function employerHref(name){return `employer-profile.html?name=${encodeURIComponent(name)}`}
  function linkEmployers(root=document){
    root.querySelectorAll('.job-card').forEach(card=>{
      const spans=card.querySelectorAll('.job-meta span');if(!spans.length)return;const first=spans[0];if(first.querySelector('a')||first.closest('a'))return;const name=(first.textContent||'').trim();if(!name)return;const a=document.createElement('a');a.className='employer-profile-link';a.href=employerHref(name);a.textContent=name;first.textContent='';first.appendChild(a);
    });
    const detail=document.querySelector('#detailEmployer');if(detail&&!detail.querySelector('a')){const name=(detail.textContent||'').trim();if(name&&name!=='-'){const a=document.createElement('a');a.className='employer-profile-link';a.href=employerHref(name);a.textContent=name;detail.textContent='';detail.appendChild(a)}}
  }

  function humanCopy(root=document){
    const replacements=new Map([
      ['việc còn mới','việc mới đăng'],['có đề cập chỗ ở','có thông tin chỗ ở'],['có dữ liệu service charge','có thông tin service charge'],['cần người sớm','đang cần người'],['Thông tin để tự quyết','Điều đáng xem'],['Cần để ý','Cần hỏi thêm'],['Nguồn vừa được kiểm tra','Nguồn vừa kiểm tra'],['Nguồn cần kiểm tra lại','Cần kiểm tra lại nguồn'],['Dùng dữ liệu thật để định hướng','Xem thị trường thật để chọn đường đi phù hợp'],['Cơ hội đang có','Việc đang mở']
    ]);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{let t=n.nodeValue;replacements.forEach((v,k)=>{if(t.includes(k))t=t.replaceAll(k,v)});n.nodeValue=t});
  }

  function rebuildFooter(){
    document.querySelector('.pqc-footer')?.remove();
    const f=document.createElement('footer');f.className='pqc-footer';
    f.innerHTML=`<div class="container pqc-footer-inner"><div class="pqc-footer-grid">
      <div class="pqc-footer-brand-block"><img src="assets/logo-official.png" alt="PhuQuocCareers by JoTrip"><p>Việc làm, đường nghề và cuộc sống ở Phú Quốc - nhìn công việc trong cả bối cảnh của hòn đảo.</p></div>
      <div class="pqc-footer-col"><strong>Người tìm việc</strong><a href="jobs.html">Tìm việc</a><a href="careers.html">Khám phá nghề</a><a href="life-in-phu-quoc.html">Sống & làm việc ở Phú Quốc</a><a href="jobs.html?saved=1">Việc đã lưu</a></div>
      <div class="pqc-footer-col"><strong>Nhà tuyển dụng</strong><a href="employer/post.html">Đăng nhu cầu tuyển dụng</a><a href="employer.html">Khu vực nhà tuyển dụng</a><a href="employer/dashboard.html">HR workspace</a></div>
      <div class="pqc-footer-col"><strong>Hệ sinh thái Phú Quốc</strong><a class="pqc-footer-live" href="phu-quoc-now.html">Phú Quốc ngay lúc này ↗</a><a href="https://openphuquoc.com" target="_blank" rel="noopener">Open Phu Quoc ↗</a><a href="index.html">PhuQuocCareers</a></div>
    </div><div class="pqc-footer-bottom"><span>PhuQuocCareers by JoTrip</span><span>Phú Quốc · việc làm · đời sống trên đảo</span></div></div>`;
    body.appendChild(f);
  }

  ensureNav();heroSlider();humanCopy();linkEmployers();rebuildFooter();
  const mo=new MutationObserver(()=>{linkEmployers();humanCopy()});mo.observe(document.body,{childList:true,subtree:true});
})();
