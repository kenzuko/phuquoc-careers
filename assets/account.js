(function(){
  const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
  const registerForm=$('#registerForm'),loginForm=$('#loginForm'),guestView=$('#accountGuest'),stateView=$('#accountState'),msg=$('#registerMessage'),loginMsg=$('#loginMessage');
  const errorText={invalid_body:'Thông tin gửi lên chưa đúng.',name_required:'Cho PhuQuocCareers biết tên của bạn trước nha.',password_too_short:'Mật khẩu cần ít nhất 8 ký tự.',work_email_required:'Nhà tuyển dụng cần một email công việc để đối chiếu.',email_or_phone_required:'Bạn để lại email hoặc số điện thoại là được.',employer_name_required:'Cho biết bạn đang làm ở đâu để tụi mình đối chiếu.',account_exists:'Thông tin này đã có tài khoản rồi. Bạn thử đăng nhập nhé.',rate_limited:'Bạn thao tác hơi nhanh. Chờ một chút rồi thử lại.',invalid_login:'Email/số điện thoại hoặc mật khẩu chưa đúng.',identifier_and_password_required:'Nhập email hoặc số điện thoại cùng mật khẩu nhé.'};
  const humanError=e=>errorText[e]||'Có gì đó chưa ổn. Bạn thử lại một lần nữa nhé.';
  let type='candidate';

  function employerNames(){return [...new Set((window.PQC_JOBS||[]).map(j=>j.employer).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'))}
  const list=$('#employerNames');if(list)list.innerHTML=employerNames().map(n=>`<option value="${String(n).replace(/"/g,'&quot;')}"></option>`).join('');

  function setType(next){type=next;$$('[data-account-type]').forEach(b=>b.classList.toggle('active',b.dataset.accountType===type));$$('.employer-only').forEach(x=>x.classList.toggle('hide',type!=='employer'));$('#candidateContactHint').textContent=type==='candidate'?'Email hoặc số điện thoại - chỉ cần một trong hai.':'Email công việc sẽ được dùng để đối chiếu doanh nghiệp.';msg.textContent='';msg.className='account-message'}
  $$('[data-account-type]').forEach(b=>b.addEventListener('click',()=>setType(b.dataset.accountType)));

  async function api(url,options={}){const res=await fetch(url,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options});let data={};try{data=await res.json()}catch{}return {res,data}}

  async function showMe(){
    try{const r=await fetch('/api/accounts/me',{credentials:'same-origin',cache:'no-store'});if(!r.ok){guestView?.classList.remove('hide');stateView?.classList.add('hide');return}const data=await r.json();if(!data.authenticated)return;renderAccount(data.account)}catch{}
  }

  function renderAccount(a){
    guestView?.classList.add('hide');stateView?.classList.remove('hide');
    const isEmployer=a.type==='employer',p=a.employer||{};let note='Tài khoản đã sẵn sàng. Bạn vẫn có thể xem việc và sử dụng PhuQuocCareers như bình thường.';
    if(isEmployer){note=p.verification_status==='verified'?'Doanh nghiệp này đã được xác minh. Các quyền dành cho HR sẽ mở theo phạm vi tài khoản được cấp.':'Tài khoản đã tạo xong. Hồ sơ doanh nghiệp đang chờ đối chiếu. Quyền đăng tin chỉ mở sau khi xác minh.'}
    stateView.innerHTML=`<h2>Chào ${escapeHtml(a.name||'bạn')}.</h2><p>${note}</p><div class="account-status-list"><div class="account-status-item"><small>Tài khoản</small><strong>${isEmployer?'Nhà tuyển dụng':'Người tìm việc'}</strong></div>${a.email?`<div class="account-status-item"><small>Email</small><strong>${escapeHtml(a.email)}</strong></div>`:''}${a.phone?`<div class="account-status-item"><small>Điện thoại</small><strong>${escapeHtml(a.phone)}</strong></div>`:''}${isEmployer?`<div class="account-status-item"><small>Nơi làm việc</small><strong>${escapeHtml(p.employer_name||p.requested_employer_name||'Đang đối chiếu')}</strong></div><div class="account-status-item"><small>Xác minh</small><strong>${p.verification_status==='verified'?'Đã xác minh':'Đang chờ xác minh'}</strong></div>`:''}</div><div class="account-actions"><a class="primary" href="${isEmployer?'employers.html':'jobs.html'}">${isEmployer?'Xem hồ sơ nhà tuyển dụng':'Tiếp tục tìm việc'}</a>${isEmployer?'<a href="employer.html">Khu vực nhà tuyển dụng</a>':'<a href="jobs.html?saved=1">Việc đã lưu</a>'}<button id="accountLogout" type="button">Đăng xuất</button></div>`;
    $('#accountLogout')?.addEventListener('click',async()=>{await api('/api/accounts/logout',{method:'POST',body:'{}'});location.reload()});
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

  registerForm?.addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(registerForm);const payload={type,name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),password:fd.get('password')};if(type==='employer'){payload.employerName=fd.get('employerName');payload.role=fd.get('role')}
    const btn=registerForm.querySelector('button[type="submit"]');btn.disabled=true;msg.textContent='Đang tạo tài khoản...';msg.className='account-message';
    try{const {res,data}=await api('/api/accounts/register',{method:'POST',body:JSON.stringify(payload)});if(!res.ok){msg.textContent=humanError(data.error);msg.className='account-message error';return}msg.textContent=type==='employer'?'Tài khoản đã tạo. Phần doanh nghiệp đang chờ đối chiếu.':'Xong rồi. Tài khoản của bạn đã được tạo.';msg.className='account-message ok';await showMe()}catch{msg.textContent='Mạng đang chập chờn. Bạn thử lại nhé.';msg.className='account-message error'}finally{btn.disabled=false}
  });

  loginForm?.addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(loginForm),btn=loginForm.querySelector('button[type="submit"]');btn.disabled=true;loginMsg.textContent='Đang đăng nhập...';loginMsg.className='account-message';
    try{const {res,data}=await api('/api/accounts/login',{method:'POST',body:JSON.stringify({identifier:fd.get('identifier'),password:fd.get('password')})});if(!res.ok){loginMsg.textContent=humanError(data.error);loginMsg.className='account-message error';return}loginMsg.textContent='Đăng nhập xong rồi.';loginMsg.className='account-message ok';await showMe()}catch{loginMsg.textContent='Mạng đang chập chờn. Bạn thử lại nhé.';loginMsg.className='account-message error'}finally{btn.disabled=false}
  });

  setType('candidate');showMe();
})();
