(function(){
  if(document.body?.dataset.page!=='jobs')return;
  const q=document.getElementById('manualSearchKeyword');
  const zone=document.getElementById('manualSearchZone');
  const dept=document.getElementById('manualSearchDept');
  const go=document.getElementById('manualSearchGo');
  if(!q||!zone||!dept||!go)return;
  const p=new URLSearchParams(location.search);
  q.value=p.get('q')||'';zone.value=p.get('zone')||'';dept.value=p.get('dept')||'';
  function submit(){const n=new URLSearchParams();if(q.value.trim())n.set('q',q.value.trim());if(zone.value)n.set('zone',zone.value);if(dept.value)n.set('dept',dept.value);location.href='jobs.html'+(n.toString()?('?'+n):'')}
  go.addEventListener('click',submit);q.addEventListener('keydown',e=>{if(e.key==='Enter')submit()});
})();