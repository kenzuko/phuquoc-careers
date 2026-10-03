(function(){
  const body=document.body;if(!body)return;
  const page=body.dataset.page||'';
  const candidatePages=['home','jobs','job','careers','compare','life','employer-profile','island-now'];
  if(!candidatePages.includes(page))return;

  if(!document.querySelector('link[href="assets/experience-v8.css"]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='assets/experience-v8.css';document.head.appendChild(css);
  }

  function ensureNav(){
    document.querySelectorAll('.navlinks').forEach(nav=>{
      [...nav.querySelectorAll('a')].forEach(a=>{if(a.getAttribute('href')==='careers.html')a.textContent='Khám phá nghề'});
      if(!nav.querySelector('a[href="life-in-phu-quoc.html"]')){
        const a=document.createElement('a');a.href='life-in-phu-quoc.html';a.textContent='Sống & làm việc';if(page==='life')a.classList.add('active');nav.appendChild(a);
      }
    });
    document.querySelectorAll('.nav-actions').forEach(actions=>{
      if(!actions.querySelector('.ecosystem-utility')){
        const eco=document.createElement('a');eco.className='ecosystem-utility';eco.href='phu-quoc-now.html';eco.textContent='Phú Quốc lúc này';actions.prepend(eco);
      }
      const employer=actions.querySelector('.employer-utility');if(employer){employer.textContent='Nhà tuyển dụng →';employer.href='employer.html'}
    });
    document.querySelectorAll('.brand-mark img').forEach(img=>{img.alt='';img.setAttribute('aria-hidden','true')});
  }

  function enhancePrimaryNav(){
    const header=document.querySelector('.topbar');const nav=document.querySelector('.navlinks');if(!header||!nav||window.matchMedia('(max-width:760px)').matches)return;
    const career=nav.querySelector('a[href="careers.html"]');const life=nav.querySelector('a[href="life-in-phu-quoc.html"]');
    if(!career||!life||document.querySelector('.pqc-nav-popover'))return;
    career.dataset.panel='career';life.dataset.panel='life';career.setAttribute('aria-haspopup','true');life.setAttribute('aria-haspopup','true');
    const pop=document.createElement('div');pop.className='pqc-nav-popover';pop.innerHTML='<div class="pqc-nav-popover-grid"></div>';document.body.appendChild(pop);
    const grid=pop.firstElementChild;
    const data={
      career:[
        ['careers.html','Xem đường nghề','Bắt đầu từ công việc hiện tại và nhìn những bước thường gặp tiếp theo.'],
        ['jobs.html','Việc đang mở theo nghề','Từ đường nghề quay lại những vị trí đang tuyển thật trên đảo.'],
        ['careers.html?start=new','Chưa biết hợp nghề gì','Bắt đầu từ nhóm nghề thay vì phải biết chính xác chức danh.']
      ],
      life:[
        ['life-in-phu-quoc.html','Sống & làm việc','Chỗ ở, khu vực, ca làm và chuyện đi lại trên đảo.'],
        ['jobs.html?view=life','Tìm việc theo điều kiện sống','Ưu tiên công việc có thông tin nhà ở, shuttle và những thứ ảnh hưởng đời sống.'],
        ['phu-quoc-now.html','Phú Quốc lúc này','Đi sang Open Phu Quoc để hiểu đảo trước khi quyết định.']
      ]
    };
    let hideTimer;
    const close=()=>{clearTimeout(hideTimer);hideTimer=setTimeout(()=>pop.classList.remove('show'),120)};
    const open=kind=>{clearTimeout(hideTimer);grid.innerHTML=data[kind].map(([href,title,desc])=>`<a href="${href}"><strong>${title}</strong><span>${desc}</span></a>`).join('');pop.classList.add('show')};
    [career,life].forEach(a=>{a.addEventListener('mouseenter',()=>open(a.dataset.panel));a.addEventListener('focus',()=>open(a.dataset.panel));a.addEventListener('mouseleave',close)});
    pop.addEventListener('mouseenter',()=>clearTimeout(hideTimer));pop.addEventListener('mouseleave',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')pop.classList.remove('show')});
  }

  function heroSlider(){
    const hero=document.querySelector('.hero-home');if(!hero)return;
    const slidesData=[
      ['https://images.pexels.com/photos/19595138/pexels-photo-19595138.jpeg?auto=compress&cs=tinysrgb&w=2400','Hospitality','Một ca làm luôn có người ở phía sau trải nghiệm.'],
      ['https://images.pexels.com/photos/17748657/pexels-photo-17748657.jpeg?auto=compress&cs=tinysrgb&w=2400','Phú Quốc','Không gian làm việc cũng là một phần của lựa chọn.'],
      ['https://images.pexels.com/photos/6481615/pexels-photo-6481615.jpeg?auto=compress&cs=tinysrgb&w=2400','Cuộc sống trên đảo','Đi làm và sống ở Phú Quốc luôn đi cùng nhau.'],
      ['https://images.pexels.com/photos/3051551/pexels-photo-3051551.jpeg?auto=compress&cs=tinysrgb&w=2400','Phú Quốc cuối ngày','Một công việc tốt phải hợp với cả nhịp sống của mình.']
    ];
    let wrap=hero.querySelector('.hero-slides');
    if(!wrap){wrap=document.createElement('div');wrap.className='hero-slides';hero.prepend(wrap)}
    wrap.innerHTML='';
    slidesData.forEach((row,i)=>{const s=document.createElement('div');s.className='hero-slide'+(i===0?' is-active':'');s.style.backgroundImage=`url('${row[0]}')`;s.dataset.title=row[1];s.dataset.caption=row[2];wrap.appendChild(s)});
    let dots=hero.querySelector('.hero-slider-dots');if(dots)dots.remove();dots=document.createElement('div');dots.className='hero-slider-dots';slidesData.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className='hero-slider-dot'+(i===0?' is-active':'');b.dataset.index=i;b.setAttribute('aria-label',`Ảnh ${i+1}`);dots.appendChild(b)});hero.appendChild(dots);
    let caption=hero.querySelector('.hero-slider-caption');if(!caption){caption=document.createElement('div');caption.className='hero-slider-caption';hero.appendChild(caption)}
    const paintCaption=i=>{const row=slidesData[i];caption.innerHTML=`<strong>${row[1]}</strong><span>${row[2]}</span>`};paintCaption(0);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let current=0,timer;
    const show=i=>{const slides=[...wrap.children],ds=[...dots.children];slides[current]?.classList.remove('is-active');ds[current]?.classList.remove('is-active');current=i%slides.length;slides[current]?.classList.add('is-active');ds[current]?.classList.add('is-active');paintCaption(current)};
    const play=()=>{clearInterval(timer);timer=setInterval(()=>show((current+1)%slidesData.length),7000)};
    dots.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;show(Number(b.dataset.index));play()});
    document.addEventListener('visibilitychange',()=>document.hidden?clearInterval(timer):play());play();
  }

  function employerHref(name){return `employer-profile.html?name=${encodeURIComponent(name)}`}
  function linkEmployers(root=document){
    root.querySelectorAll('.job-card').forEach(card=>{
      const candidates=[...card.querySelectorAll('.job-meta span,.job-employer,.employer-name')];
      const target=candidates.find(el=>{const t=(el.textContent||'').trim();return t&&t.length>2&&!/^(Phú Quốc|Nam đảo|Bãi Trường|Dương Đông|Bắc đảo|Nguồn)/i.test(t)});
      if(!target||target.querySelector('a')||target.closest('a'))return;const name=(target.textContent||'').trim();const a=document.createElement('a');a.className='employer-profile-link';a.href=employerHref(name);a.textContent=name;target.textContent='';target.appendChild(a);
    });
    const detail=document.querySelector('#detailEmployer');if(detail&&!detail.querySelector('a')){const name=(detail.textContent||'').trim();if(name&&name!=='-'){const a=document.createElement('a');a.className='employer-profile-link';a.href=employerHref(name);a.textContent=name;detail.textContent='';detail.appendChild(a)}}
  }

  function humanCopy(root=document){
    const replacements=new Map([
      ['việc còn mới','việc mới đăng'],['có đề cập chỗ ở','có thông tin chỗ ở'],['có dữ liệu service charge','có thông tin service charge'],['cần người sớm','đang cần người'],['Thông tin để tự quyết','Điều đáng xem'],['Cần để ý','Cần hỏi thêm'],['Nguồn vừa được kiểm tra','Nguồn vừa kiểm tra'],['Nguồn cần kiểm tra lại','Cần kiểm tra lại nguồn'],['Dùng dữ liệu thật để định hướng','Xem thị trường thật để chọn đường đi phù hợp'],['Cơ hội đang có','Việc đang mở'],['Chưa xác nhận','Chưa thấy thông tin'],['Cần xác nhận','Cần hỏi lại'],['Nguồn tuyển','Nguồn tin']
    ]);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{let t=n.nodeValue;replacements.forEach((v,k)=>{if(t.includes(k))t=t.replaceAll(k,v)});n.nodeValue=t});
  }

  function addPulse(){
    if(page!=='home'||document.querySelector('.home-pulse'))return;
    const hero=document.querySelector('.hero-home');if(!hero)return;
    const jobs=window.PQC_JOBS||[];const fresh=jobs.filter(j=>j.fresh!==false);const employers=new Set(fresh.map(j=>j.employer).filter(Boolean));const counts={};fresh.forEach(j=>{if(j.department)counts[j.department]=(counts[j.department]||0)+1});const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const sec=document.createElement('section');sec.className='home-pulse';sec.innerHTML=`<div class="container home-pulse-inner"><div class="home-pulse-title">Đang diễn ra</div><div class="home-pulse-item"><b>${fresh.length}</b> việc đang mở</div><div class="home-pulse-item"><b>${employers.size}</b> nhà tuyển dụng đang có dữ liệu</div>${top?`<div class="home-pulse-item"><b>${top[0]}</b> đang xuất hiện nhiều</div>`:''}<a class="home-pulse-open" href="phu-quoc-now.html">Xem Phú Quốc ngay lúc này →</a></div>`;hero.insertAdjacentElement('afterend',sec);
  }

  function addWorklife(){
    if(page!=='home'||document.querySelector('.worklife-strip'))return;
    const market=document.querySelector('.market-raised');if(!market)return;
    const sec=document.createElement('section');sec.className='worklife-strip';sec.innerHTML=`<div class="container"><div class="worklife-head"><h2>Một ngày đi làm ở Phú Quốc có nhiều hơn một công việc.</h2><p>Có người đón khách, người chuẩn bị phòng, người đứng bếp. Và sau ca làm là cả một hòn đảo để sống.</p></div><div class="worklife-grid"><article class="worklife-card" style="background-image:url('https://images.pexels.com/photos/19595138/pexels-photo-19595138.jpeg?auto=compress&cs=tinysrgb&w=1400')"><div class="worklife-card-content"><small>F&B</small><strong>Phục vụ là một nghề có nhịp riêng.</strong><span>Không chỉ là đứng bàn. Là giao tiếp, tốc độ và cảm giác với khách.</span></div></article><article class="worklife-card" style="background-image:url('https://images.pexels.com/photos/5371676/pexels-photo-5371676.jpeg?auto=compress&cs=tinysrgb&w=1200')"><div class="worklife-card-content"><small>Front Office</small><strong>Mỗi ca bắt đầu từ một lời chào.</strong><span>Nhìn nghề qua công việc thật và đường đi tiếp.</span></div></article><article class="worklife-card" style="background-image:url('https://images.pexels.com/photos/3051551/pexels-photo-3051551.jpeg?auto=compress&cs=tinysrgb&w=1200')"><div class="worklife-card-content"><small>Cuộc sống</small><strong>Tan ca rồi, mình vẫn đang ở Phú Quốc.</strong><span>Chỗ ở, đường về và nhịp sống đều đáng để tính.</span></div></article></div></div>`;market.insertAdjacentElement('afterend',sec);
  }

  function addJourneyLinks(){
    if(page==='home'||document.querySelector('.pqc-journey'))return;
    const targets={
      jobs:[['careers.html','Khám phá nghề','Từ việc đang xem, nhìn đường đi tiếp của nghề.'],['life-in-phu-quoc.html','Sống & làm việc','Xem chỗ ở, khu vực và nhịp sống trước khi chọn việc.'],['phu-quoc-now.html','Phú Quốc lúc này','Hiểu đảo đang diễn ra thế nào qua Open Phu Quoc.']],
      job:[['jobs.html','Tìm việc khác','Quay lại thị trường và đặt các lựa chọn cạnh nhau.'],['careers.html','Khám phá nghề','Xem vị trí này nằm ở đâu trong đường nghề.'],['employer-profile.html','Nhà tuyển dụng','Tìm hiểu nơi tuyển, nguồn và tình trạng xác minh.']],
      careers:[['jobs.html','Việc đang mở','Biến đường nghề thành những lựa chọn đang tuyển thật.'],['life-in-phu-quoc.html','Sống & làm việc','Một bước nghề cũng là một thay đổi trong cuộc sống trên đảo.'],['phu-quoc-now.html','Phú Quốc lúc này','Hiểu bối cảnh của hòn đảo trước khi quyết định.']],
      life:[['jobs.html?view=life','Tìm việc theo điều kiện sống','Ưu tiên job có dữ liệu chỗ ở, shuttle và package.'],['careers.html','Khám phá nghề','Đặt cuộc sống cạnh đường nghề của bạn.'],['phu-quoc-now.html','Phú Quốc lúc này','Thời tiết, đi lại và nhịp đảo từ Open Phu Quoc.']],
      compare:[['jobs.html','Tìm thêm việc','Thêm lựa chọn trước khi so sánh.'],['life-in-phu-quoc.html','Nhìn điều kiện sống','Đừng chỉ đặt lương cạnh nhau.'],['careers.html','Nhìn đường nghề','So luôn bước tiếp theo của mỗi lựa chọn.']],
      'employer-profile':[['jobs.html','Việc đang mở','Xem những cơ hội đang có trên toàn đảo.'],['life-in-phu-quoc.html','Sống & làm việc','Hiểu khu vực và đời sống quanh nơi tuyển.'],['phu-quoc-now.html','Phú Quốc lúc này','Xem hòn đảo đang vận hành thế nào.']],
      'island-now':[['jobs.html','Tìm việc','Quay về những công việc đang mở.'],['life-in-phu-quoc.html','Sống & làm việc','Đặt thông tin đảo vào quyết định sống và làm việc.'],['careers.html','Khám phá nghề','Tiếp tục từ bối cảnh đảo sang đường nghề.']]
    };
    const cards=targets[page];if(!cards)return;
    const sec=document.createElement('section');sec.className='pqc-journey';sec.innerHTML=`<div class="pqc-journey-inner"><div class="pqc-journey-head"><h2>Đi tiếp từ đây</h2><p>PhuQuocCareers nối việc, nghề và cuộc sống trên đảo trong cùng một hành trình.</p></div><div class="pqc-journey-grid">${cards.map(([href,title,desc],i)=>`<a class="pqc-journey-card" href="${href}"><small>${['Việc','Nghề','Đảo'][i]||'Tiếp'}</small><strong>${title}</strong><span>${desc}</span></a>`).join('')}</div></div>`;
    const footer=document.querySelector('.pqc-footer');if(footer)footer.before(sec);else body.appendChild(sec);
  }

  function rebuildFooter(){
    document.querySelector('.pqc-footer')?.remove();
    const f=document.createElement('footer');f.className='pqc-footer';
    f.innerHTML=`<div class="container pqc-footer-inner"><div class="pqc-footer-grid">
      <div class="pqc-footer-brand-block"><div class="pqc-footer-brand-lockup"><span class="pqc-footer-mark"></span><span class="pqc-footer-name"><strong>PHU QUOC</strong><span>CAREERS</span><small>by JoTrip</small></span></div><p>Việc làm, đường nghề và cuộc sống ở Phú Quốc. Dữ liệu nào chưa rõ thì để nguyên là chưa rõ.</p><div class="pqc-footer-contact">Thông tin liên hệ của doanh nghiệp được hiển thị trong <a href="jobs.html">hồ sơ nhà tuyển dụng</a> khi có nguồn chính thức.</div></div>
      <div class="pqc-footer-col"><strong>Người tìm việc</strong><a href="jobs.html">Tìm việc</a><a href="careers.html">Khám phá nghề</a><a href="life-in-phu-quoc.html">Sống & làm việc ở Phú Quốc</a><a href="jobs.html?saved=1">Việc đã lưu</a></div>
      <div class="pqc-footer-col"><strong>Nhà tuyển dụng</strong><a href="employer.html">Tìm hiểu PhuQuocCareers</a><a href="employer/post.html">Đăng nhu cầu tuyển dụng</a><a href="employer/dashboard.html">Khu vực HR</a></div>
      <div class="pqc-footer-col"><strong>Hệ sinh thái Phú Quốc</strong><a class="pqc-footer-live" href="phu-quoc-now.html">Phú Quốc ngay lúc này ↗</a><a href="https://openphuquoc.com" target="_blank" rel="noopener">Open Phu Quoc ↗</a><a href="index.html">PhuQuocCareers</a></div>
    </div><div class="pqc-footer-bottom"><span>PhuQuocCareers by JoTrip</span><span>Hiểu việc · hiểu nghề · hiểu đảo</span></div></div>`;body.appendChild(f);
  }

  ensureNav();enhancePrimaryNav();heroSlider();addPulse();addWorklife();humanCopy();linkEmployers();rebuildFooter();addJourneyLinks();
  const mo=new MutationObserver(()=>{linkEmployers();humanCopy()});mo.observe(document.body,{childList:true,subtree:true});
})();
