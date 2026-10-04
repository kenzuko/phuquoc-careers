(function(){
  const state=document.getElementById('accountState');
  if(!state)return;
  let injected=false;

  const esc=value=>String(value??'').replace(/[&<>\"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
  }[char]));

  const employerOptions=()=>[...new Set((window.PQC_JOBS||[]).map(job=>job.employer).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'vi'))
    .map(name=>`<option value="${esc(name)}"></option>`)
    .join('');

  async function api(url,options={}){
    const response=await fetch(url,{
      credentials:'same-origin',
      headers:{'content-type':'application/json',...(options.headers||{})},
      ...options
    });
    let data={};
    try{data=await response.json()}catch{}
    return {response,data};
  }

  async function mount(){
    if(injected||state.classList.contains('hide'))return;

    let roleData;
    try{
      const response=await fetch('/api/account-roles',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return;
      roleData=await response.json();
    }catch{
      return;
    }
    if(!roleData?.authenticated)return;

    injected=true;
    const roles=roleData.roles||[];
    const hasEmployer=roles.includes('employer');
    const hasCandidate=roles.includes('candidate');
    const panel=document.createElement('section');
    panel.className='account-role-panel';

    if(hasEmployer&&hasCandidate){
      panel.innerHTML='<h3>Một tài khoản, hai vai trò.</h3><p>Bạn có thể vừa tìm việc vừa quản lý phần nhà tuyển dụng. Xác minh doanh nghiệp và quyền HR vẫn là chuyện riêng, không tự mở chỉ vì có vai trò nhà tuyển dụng.</p>';
      state.appendChild(panel);
      return;
    }

    if(!hasEmployer){
      panel.innerHTML=`
        <h3>Bạn cũng đang tuyển người?</h3>
        <p>Không cần tạo thêm tài khoản. Thêm vai trò nhà tuyển dụng vào tài khoản này, rồi PhuQuocCareers sẽ đối chiếu doanh nghiệp trước khi mở quyền.</p>
        <form id="addEmployerRole" class="account-role-form">
          <input class="full" name="employerName" list="accountRoleEmployers" required placeholder="Tên resort, khách sạn hoặc doanh nghiệp">
          <datalist id="accountRoleEmployers">${employerOptions()}</datalist>
          ${roleData.hasEmail?'':'<input class="full" name="email" type="email" required placeholder="Email dùng để đối chiếu doanh nghiệp">'}
          <select name="role">
            <option value="recruiter">Tuyển dụng / HR</option>
            <option value="hiring_manager">Quản lý tuyển dụng</option>
            <option value="admin">Quản trị hồ sơ doanh nghiệp</option>
            <option value="owner">Chủ doanh nghiệp</option>
          </select>
          <button class="account-submit" type="submit">Thêm vai trò nhà tuyển dụng</button>
          <div id="accountRoleMessage" class="account-role-message full" aria-live="polite"></div>
        </form>`;
      state.appendChild(panel);

      const form=document.getElementById('addEmployerRole');
      const message=document.getElementById('accountRoleMessage');
      form?.addEventListener('submit',async event=>{
        event.preventDefault();
        const formData=new FormData(form);
        const button=form.querySelector('button[type="submit"]');
        button.disabled=true;
        message.textContent='Đang gửi để đối chiếu...';
        message.className='account-role-message';

        const {response,data}=await api('/api/account-roles/employer',{
          method:'POST',
          body:JSON.stringify({
            employerName:formData.get('employerName'),
            email:formData.get('email'),
            role:formData.get('role')
          })
        });

        if(response.ok){
          message.textContent='Đã thêm vai trò nhà tuyển dụng. Hồ sơ doanh nghiệp sẽ giữ trạng thái chờ xác minh cho tới khi được đối chiếu.';
          message.className='account-role-message ok';
          setTimeout(()=>location.reload(),700);
          return;
        }

        const errors={
          work_email_required:'Cần một email để đối chiếu doanh nghiệp.',
          employer_name_required:'Nhập tên nơi bạn đang tuyển người.',
          account_exists:'Email này đang thuộc một tài khoản khác.'
        };
        message.textContent=errors[data.error]||'Chưa thêm được vai trò. Bạn thử lại nhé.';
        message.className='account-role-message error';
        button.disabled=false;
      });
      return;
    }

    if(!hasCandidate){
      panel.innerHTML='<h3>Bạn cũng muốn tìm việc bằng tài khoản này?</h3><p>Không cần tạo tài khoản khác. Vai trò người tìm việc không ảnh hưởng quyền nhà tuyển dụng.</p><button id="addCandidateRole" class="account-submit" type="button">Thêm vai trò người tìm việc</button><div id="accountRoleMessage" class="account-role-message" aria-live="polite"></div>';
      state.appendChild(panel);

      document.getElementById('addCandidateRole')?.addEventListener('click',async event=>{
        event.currentTarget.disabled=true;
        const {response}=await api('/api/account-roles/candidate',{method:'POST',body:'{}'});
        if(response.ok){
          location.reload();
          return;
        }
        document.getElementById('accountRoleMessage').textContent='Chưa thêm được vai trò. Bạn thử lại nhé.';
        event.currentTarget.disabled=false;
      });
    }
  }

  const observer=new MutationObserver(()=>mount());
  observer.observe(state,{attributes:true,childList:true,subtree:false});
  setTimeout(mount,80);
})();
