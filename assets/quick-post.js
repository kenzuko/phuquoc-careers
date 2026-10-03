(function(){
  const form=document.getElementById('quickJobForm'),status=document.getElementById('quickJobStatus');if(!form)return;
  const say=(message,ok=false)=>{status.textContent=message;status.classList.toggle('ok',ok);status.classList.toggle('error',!ok)};
  form.addEventListener('submit',async e=>{
    e.preventDefault();say('Đang gửi tin...');
    const f=new FormData(form),payload=Object.fromEntries(f.entries());
    try{
      const r=await fetch('/api/quick-jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const data=await r.json().catch(()=>({}));
      if(r.status===401){say('Bạn cần đăng nhập trước khi gửi tin. Đang mở trang tài khoản...');setTimeout(()=>location.href='account.html?next='+encodeURIComponent('quick-post.html'),700);return}
      if(!r.ok){const labels={title_required:'Vui lòng ghi vị trí cần tuyển.',employer_name_required:'Vui lòng ghi tên nơi tuyển.',zone_required:'Vui lòng chọn khu vực.',contact_required:'Vui lòng để lại cách liên hệ.'};say(labels[data.error]||'Chưa gửi được tin. Kiểm tra lại thông tin rồi thử lại.');return}
      say('Đã nhận tin. Tin đang chờ kiểm tra trước khi hiển thị và sẽ tự hết hạn sau 14 ngày.',true);form.reset();
    }catch{say('Chưa kết nối được máy chủ. Thử lại sau một chút.')}
  });
})();
