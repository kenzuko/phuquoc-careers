import test from 'node:test';
import assert from 'node:assert/strict';
import {publicJob} from '../worker/src/extensions.mjs';

const base={
  id:'job_x',title:'Front Office Agent',employer_name:'Hotel X',operator:'Operator X',department:'Front Office',location:'Phú Quốc',zone:null,employment:null,experience:null,english:null,salary_text:null,service_charge_state:'unknown',staff_house_state:'mentioned',meals_text:null,shuttle_state:'no',off_days_text:null,urgent:0,freshness_status:'fresh',last_seen_at:'2026-10-02T00:00:00Z',employer_confirmed_at:null,description:'',source_url:'https://example.com/job'
};

test('runtime mapper preserves unknown instead of converting it to no',()=>{
  const j=publicJob(base);
  assert.equal(j.serviceCharge,null);
  assert.equal(j.staffHouse,null);
  assert.equal(j.shuttle,false);
  assert.ok(j.tags.includes('Accommodation mentioned'));
});

test('employer-confirmed job without external URL is labeled truthfully',()=>{
  const j=publicJob({...base,source_url:null,employer_confirmed_at:'2026-10-02T01:00:00Z'});
  assert.equal(j.sourceType,'Employer confirmed');
  assert.equal(j.sourceUrl,null);
  assert.equal(j.verifiedByEmployer,true);
});
