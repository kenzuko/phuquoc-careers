(async function(){
  const status=document.getElementById('mapStatus'),el=document.getElementById('workplaceMap');if(!el)return;
  if(!window.L){status.textContent='Bản đồ chưa tải được. Bạn vẫn có thể xem việc dạng danh sách.';return}
  const map=L.map(el,{scrollWheelZoom:false}).setView([10.22,103.96],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
  try{
    const r=await fetch('/api/workplaces'),data=await r.json();if(!r.ok)throw new Error('api');const rows=data.items||[];
    if(!rows.length){status.textContent='Chưa có workplace nào đủ chuẩn tọa độ để ghim. Bản đồ sẽ tự có điểm khi dữ liệu vị trí được đối chiếu.';return}
    const bounds=[];rows.forEach(w=>{const lat=Number(w.latitude),lng=Number(w.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;bounds.push([lat,lng]);const jobs=Number(w.open_jobs||0);L.marker([lat,lng]).addTo(map).bindPopup(`<strong>${escapeHtml(w.name)}</strong><br>${escapeHtml(w.zone||'Phú Quốc')}<br>${jobs} việc đang mở<br><small>Vị trí: ${w.location_accuracy==='exact'?'đã xác minh chính xác':'địa chỉ đã đối chiếu'}</small>`)});if(bounds.length)map.fitBounds(bounds,{padding:[30,30],maxZoom:14});status.textContent=`Đang hiển thị ${bounds.length} nơi làm việc có vị trí đủ tin cậy.`;
  }catch{status.textContent='Chưa lấy được dữ liệu workplace. Bản đồ không tự suy đoán vị trí.'}
  function escapeHtml(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
})();
