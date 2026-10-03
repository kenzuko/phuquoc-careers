const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=120'}});

export async function workplaceRoute(req,env,url){
  if(url.pathname!=='/api/workplaces'||req.method!=='GET')return null;
  const rows=await env.DB.prepare(`SELECT w.id,w.name,w.industry,w.address_text,w.zone,w.latitude,w.longitude,w.location_accuracy,w.location_source,w.location_verified_at,e.name employer_name,COUNT(DISTINCT jw.job_id) open_jobs FROM workplaces w LEFT JOIN employers e ON e.id=w.employer_id LEFT JOIN job_workplaces jw ON jw.workplace_id=w.id LEFT JOIN jobs j ON j.id=jw.job_id AND j.freshness_status!='expired' WHERE w.latitude IS NOT NULL AND w.longitude IS NOT NULL AND w.location_accuracy IN ('exact','verified_address') GROUP BY w.id ORDER BY open_jobs DESC,w.name ASC LIMIT 300`).all();
  return json({ok:true,items:rows.results||[],policy:'Only exact or verified-address workplaces are mapped. Approximate/unknown coordinates are excluded.'});
}
