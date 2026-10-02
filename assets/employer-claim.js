(function(){
  const $=id=>document.getElementById(id);if(!$('claimEmployer'))return;
  const jobs=window.PQC_JOBS||[];
  const employers=[...new Set(jobs.map(j=>j.employer).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  $('claimEmployer').innerHTML=employers.map(name=>`<option value="${name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${name}</option>`).join('');
  const freeDomains=new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.com.vn','outlook.com','hotmail.com','live.com','icloud.com','me.com']);
  const emailDomain=()=>($('claimEmail').value.trim().toLowerCase().split('@')[1]||'');
  function refreshProof(){const domain=emailDomain();const manual=domain&&freeDomains.has(domain);$('claimProofWrap').classList.toggle('hide',!manual);$('claimHint').querySelector('strong').textContent=manual?'Email cá nhân cần manual review.':'Work email giúp đối chiếu nhanh hơn.';$('claimHint').querySelector('p').textContent=manual?'Thêm website, Facebook Page hoặc trang tuyển dụng chính thức của doanh nghiệp. Claim vẫn ở trạng thái pending cho tới khi được duyệt.':'Claim vẫn ở trạng thái pending cho tới khi identity và membership được xác minh.'}
  $('claimEmail').addEventListener('input',refreshProof);refreshProof();
  $('claimSubmit').addEventListener('click',async()=>{
    const employerName=$('claimEmployer').value;const email=$('claimEmail').value.trim();const role=$('claimRole').value;const proofUrl=$('claimProofUrl').value.trim();const consent=$('claimConsent').checked;
    if(!employerName||!email){alert('Chọn doanh nghiệp và nhập email HR trước nhé.');return}
    if(!consent){alert('Bạn cần xác nhận quyền đại diện/tuyển dụng cho employer này.');return}
    const btn=$('claimSubmit');btn.disabled=true;btn.textContent='Đang gửi...';
    const draft={employerName,email,role,proofUrl,consent,updatedAt:new Date().toISOString()};localStorage.setItem('pqc-employer-claim-draft',JSON.stringify(draft));
    let res=null,data=null;
    try{res=await fetch('/api/employer-claims',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(draft)});data=await res.json().catch(()=>null)}catch{}
    const box=$('claimResult');box.classList.add('show');
    if(res?.ok){box.textContent=`✓ Đã gửi yêu cầu claim. Trạng thái: pending${data?.claimId?` · Mã ${data.claimId}`:''}. Chưa mở quyền xem candidate cho tới khi được xác minh.`;localStorage.removeItem('pqc-employer-claim-draft');btn.textContent='Đã gửi claim'}
    else {const errors={proof_required:'Email cá nhân cần thêm link/kênh chính thức để đối chiếu.',email_invalid:'Email chưa đúng định dạng.',employer_not_found:'Employer này chưa có trong database.',consent_required:'Cần xác nhận quyền đại diện trước khi gửi.'};box.textContent=res?`Chưa gửi được: ${errors[data?.error]||data?.error||'dữ liệu chưa hợp lệ'}.`:'✓ Đã lưu nháp trên thiết bị. Backend chưa kết nối nên claim CHƯA được gửi.';btn.disabled=false;btn.textContent='Gửi lại yêu cầu claim'}
  });
})();
