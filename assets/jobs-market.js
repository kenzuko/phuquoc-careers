(function(){
  const jobs=window.PQC_JOBS||[],select=document.getElementById('marketDept');if(!select)return;
  const counts={};jobs.forEach(j=>{const d=String(j.department||'').trim();if(d)counts[d]=(counts[d]||0)+1});
  Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'vi')).forEach(([name,n])=>{const o=document.createElement('option');o.value=name;o.textContent=`${name} · ${n}`;select.appendChild(o)});
  const p=new URLSearchParams(location.search);select.value=p.get('dept')||'';
  select.addEventListener('change',()=>{const q=new URLSearchParams(location.search);if(select.value)q.set('dept',select.value);else q.delete('dept');location.href=`jobs.html?${q.toString()}`});
  const zone=document.querySelector('.manual-search-head [data-filter="zone"]');if(zone){zone.value=p.get('zone')||'';zone.addEventListener('change',()=>{const q=new URLSearchParams(location.search);if(zone.value)q.set('zone',zone.value);else q.delete('zone');location.href=`jobs.html?${q.toString()}`})}
})();
