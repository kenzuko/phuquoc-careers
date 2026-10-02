(function(){
  const jobs=window.PQC_JOBS||[];const $=id=>document.getElementById(id);if(!$('jobDetail'))return;
  const id=new URLSearchParams(location.search).get('id');const job=jobs.find(j=>j.id===id)||jobs[0];if(!job)return;
  const type=$('sourceType'),link=$('sourceLink'),requirements=$('requirementList');
  if(type&&!type.textContent)type.textContent=job.verifiedByEmployer?'Employer confirmed':'Nguồn tuyển dụng chính thức';
  if(!job.sourceUrl){
    if(type)type.textContent=job.verifiedByEmployer?'Employer confirmed':'Không có link nguồn công khai';
    if(link){link.removeAttribute('href');link.textContent=job.verifiedByEmployer?'Thông tin được employer xác nhận trên PhuQuocCareers':'Không có link nguồn công khai';link.setAttribute('aria-disabled','true');link.style.pointerEvents='none';link.style.opacity='.7'}
    if(requirements?.lastElementChild&&job.verifiedByEmployer)requirements.lastElementChild.textContent='Các yêu cầu khác: theo thông tin employer đã xác nhận.';
  }
})();
