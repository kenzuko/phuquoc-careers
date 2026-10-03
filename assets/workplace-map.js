(async function(){
  const status=document.getElementById('mapStatus'),el=document.getElementById('workplaceMap'),near=document.getElementById('nearMeBtn');if(!el)return;
  if(!window.L){status.textContent='Bản đồ chưa tải được. Bạn vẫn có thể xem việc dạng danh sách.';return}
  const map=L.map(el,{scrollWheelZoom:false}).setView([10.22,103.96],11),markers=L.layerGroup().addTo(map);let rows=[],userMarker=null;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const km=(a,b,c,d)=>{const R=6371,r=x=>x*Math.PI/180,da=r(c-a),db=r(d-b),h=Math.sin(da/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(db/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
  function popup(w,distance){const jobs=Number(w.open_jobs||0);return `<strong>${esc(w.name)}</strong><br>${esc(w.zone||'Phú Quốc')}<br>${jobs} việc đang mở${distance!=null?`<br><b>Cách bạn khoảng ${distance.toFixed(distance<10?1:0)} km</b>`:''}<br><small>Vị trí đã được đối chiếu</small>`}
  function draw(distanceFrom){
    markers.clearLayers();const bounds=[];rows.forEach(w=>{const lat=Number(w.latitude),lng=Number(w.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;bounds.push([lat,lng]);const d=distanceFrom?km(distanceFrom.lat,distanceFrom.lng,lat,lng):null;L.marker([lat,lng]).addTo(markers).bindPopup(popup(w,d))});if(bounds.length&&!distanceFrom)map.fitBounds(bounds,{padding:[30,30],maxZoom:14});
  }
  try{
    const r=await fetch('/api/workplaces'),data=await r.json();if(!r.ok)throw new Error('api');rows=data.items||[];
    if(!rows.length){status.textContent='Chưa có nơi làm việc nào đủ chắc vị trí để ghim. Khi đối chiếu được, điểm mới sẽ tự xuất hiện ở đây.';near?.setAttribute('disabled','');return}
    draw();status.textContent=`Đang hiển thị ${rows.length} nơi làm việc đã đối chiếu vị trí.`;
  }catch{status.textContent='Chưa lấy được dữ liệu vị trí. Bản đồ sẽ không tự đoán.';near?.setAttribute('disabled','')}
  near?.addEventListener('click',()=>{
    if(!navigator.geolocation){status.textContent='Thiết bị này chưa hỗ trợ lấy vị trí.';return}
    near.disabled=true;status.textContent='Đang lấy vị trí của bạn...';
    navigator.geolocation.getCurrentPosition(pos=>{const here={lat:pos.coords.latitude,lng:pos.coords.longitude};if(userMarker)userMarker.remove();userMarker=L.circleMarker([here.lat,here.lng],{radius:8}).addTo(map).bindPopup('Bạn đang ở gần đây').openPopup();let nearest=null;for(const w of rows){const d=km(here.lat,here.lng,Number(w.latitude),Number(w.longitude));if(!nearest||d<nearest.d)nearest={w,d}}draw(here);if(nearest){map.fitBounds([[here.lat,here.lng],[Number(nearest.w.latitude),Number(nearest.w.longitude)]],{padding:[45,45],maxZoom:14});status.textContent=`Gần bạn nhất trong dữ liệu hiện có: ${nearest.w.name}, khoảng ${nearest.d.toFixed(nearest.d<10?1:0)} km.`}near.disabled=false},()=>{status.textContent='Không lấy được vị trí. Bạn vẫn có thể dòm bản đồ và chọn khu vực.';near.disabled=false},{enableHighAccuracy:false,timeout:8000,maximumAge:300000});
  });
})();
