import test from 'node:test';
import assert from 'node:assert/strict';
import {safeHttpUrl} from '../worker/src/drafts.mjs';

test('draft source URL accepts only http/https',()=>{
  assert.equal(safeHttpUrl('https://careers.example.com/job/123'),'https://careers.example.com/job/123');
  assert.equal(safeHttpUrl('http://example.com/job'),'http://example.com/job');
  assert.equal(safeHttpUrl('javascript:alert(1)'),null);
  assert.equal(safeHttpUrl('data:text/html,boom'),null);
  assert.equal(safeHttpUrl('not a url'),null);
});
