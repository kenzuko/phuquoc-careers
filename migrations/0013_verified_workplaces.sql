-- First workplace pins with coordinates published by the properties themselves.
-- Do not add approximate area centroids here. A workplace only enters the public map when its point is exact or its address has been independently verified.

INSERT OR IGNORE INTO workplaces(id,employer_id,name,industry,address_text,zone,latitude,longitude,location_accuracy,location_source,location_verified_at,created_at,updated_at)
SELECT 'wp_novotel_phu_quoc',id,'Novotel Phu Quoc Resort','Hospitality','Sonasea Villas and Resort, Duong Bao Area, Phu Quoc Special Zone, An Giang','Bãi Trường',10.128920,103.982711,'exact','https://all.accor.com/hotel/9770/index.en.shtml','2026-10-04T00:00:00+07:00',datetime('now'),datetime('now') FROM employers WHERE name='Novotel Phu Quoc Resort' LIMIT 1;

INSERT OR IGNORE INTO workplaces(id,employer_id,name,industry,address_text,zone,latitude,longitude,location_accuracy,location_source,location_verified_at,created_at,updated_at)
SELECT 'wp_pullman_phu_quoc',id,'Pullman Phu Quoc Beach Resort','Hospitality','Group 6 Ban Quy Hamlet, Duong Bao Area, Phu Quoc Special Zone, An Giang','Bãi Trường',10.120242,103.983464,'exact','https://all.accor.com/hotel/A248/index.en.shtml','2026-10-04T00:00:00+07:00',datetime('now'),datetime('now') FROM employers WHERE name='Pullman Phu Quoc Beach Resort' LIMIT 1;

INSERT OR IGNORE INTO job_workplaces(job_id,workplace_id,is_primary,created_at)
SELECT j.id,'wp_novotel_phu_quoc',1,datetime('now') FROM jobs j JOIN employers e ON e.id=j.employer_id WHERE e.name='Novotel Phu Quoc Resort';

INSERT OR IGNORE INTO job_workplaces(job_id,workplace_id,is_primary,created_at)
SELECT j.id,'wp_pullman_phu_quoc',1,datetime('now') FROM jobs j JOIN employers e ON e.id=j.employer_id WHERE e.name='Pullman Phu Quoc Beach Resort';
