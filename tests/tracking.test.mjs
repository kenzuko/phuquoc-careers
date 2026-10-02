import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrackingToken,hashTrackingToken} from '../worker/src/crypto.mjs';
import {canTransitionApplication,normalizeWithdrawalReason} from '../worker/src/domain.mjs';

test('tracking token is high entropy and only compared by hash',async()=>{
  const a=createTrackingToken();const b=createTrackingToken();
  assert.notEqual(a,b);assert.ok(a.length>=40);
  assert.equal(await hashTrackingToken(a),await hashTrackingToken(a));
  assert.notEqual(await hashTrackingToken(a),await hashTrackingToken(b));
});

test('application lifecycle only moves forward while open',()=>{
  assert.equal(canTransitionApplication('submitted','viewed'),true);
  assert.equal(canTransitionApplication('viewed','interview'),true);
  assert.equal(canTransitionApplication('interview','offer'),true);
  assert.equal(canTransitionApplication('offer','joined'),true);
  assert.equal(canTransitionApplication('interview','withdrawn'),true);
  assert.equal(canTransitionApplication('joined','offer'),false);
  assert.equal(canTransitionApplication('rejected','interview'),false);
});

test('withdrawal reason is allowlisted',()=>{
  assert.equal(normalizeWithdrawalReason('salary'),'salary');
  assert.equal(normalizeWithdrawalReason('anything-else'),'other');
});
