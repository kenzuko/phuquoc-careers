import test from 'node:test';import assert from 'node:assert/strict';import {validateApplication,validateIntent,intentExpiry,normalizePhone,normalizeSourceChannel} from '../worker/src/domain.mjs';
test('phone normalization',()=>assert.equal(normalizePhone('+84 912 345 678'),'0912345678'));
test('application requires explicit consent',()=>assert.equal(validateApplication({jobId:'j',name:'A',phone:'0912345678',consent:false}).error,'consent_required'));
test('valid guest apply',()=>assert.equal(validateApplication({jobId:'j',name:'A',phone:'0912345678',consent:true}).ok,true));
test('intent enum is strict',()=>{assert.equal(validateIntent({intent:'open_to_offers'}).ok,true);assert.equal(validateIntent({intent:'maybe'}).ok,false)});
test('intent expires after 30 days',()=>assert.equal(intentExpiry(new Date('2026-10-02T00:00:00Z')),'2026-11-01T00:00:00.000Z'));
test('source channel allowlist',()=>{assert.equal(normalizeSourceChannel('facebook'),'facebook');assert.equal(normalizeSourceChannel('FACEBOOK'),'facebook');assert.equal(normalizeSourceChannel('random-network'),'direct')});
