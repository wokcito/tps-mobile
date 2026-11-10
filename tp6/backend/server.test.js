const test = require('node:test');
const assert = require('node:assert');
const { createServer } = require('./server');

async function withServer(fn) {
  const s = createServer();
  await new Promise(r => s.listen(0, r));
  const base = `http://127.0.0.1:${s.address().port}`;
  try { await fn(base); } finally { s.close(); }
}
const post = (base, body) =>
  fetch(base + '/sync', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

test('accepts a valid action and logs it', () => withServer(async base => {
  const r = await post(base, { id: 'a1', type: 'report', payload: { id: 'r1' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).status, 'ok');
  const log = await (await fetch(base + '/sync/log')).json();
  assert.strictEqual(log.length, 1);
}));

test('is idempotent on repeated action id', () => withServer(async base => {
  const a = { id: 'a1', type: 'report', payload: { id: 'r1' } };
  await post(base, a);
  const r = await post(base, a);
  assert.strictEqual((await r.json()).status, 'duplicate');
  assert.strictEqual((await (await fetch(base + '/sync/log')).json()).length, 1);
}));

test('rejects invalid json and missing fields with 400', () => withServer(async base => {
  assert.strictEqual((await post(base, '{nope')).status, 400);
  assert.strictEqual((await post(base, { id: 'x' })).status, 400);
}));

test('returns 409 when baseVersion is stale', () => withServer(async base => {
  await post(base, { id: 'a1', type: 'report', payload: { id: 'r1' } });
  await post(base, { id: 'a2', type: 'report', payload: { id: 'r1' }, baseVersion: 1 });
  const r = await post(base, { id: 'a3', type: 'report', payload: { id: 'r1' }, baseVersion: 0 });
  assert.strictEqual(r.status, 409);
  assert.strictEqual((await r.json()).serverVersion, 2);
}));

test('serves technical sheets and 404s unknown codes', () => withServer(async base => {
  const ok = await fetch(base + '/devices/ONT-0001');
  assert.strictEqual((await ok.json()).vendor, 'Huawei');
  assert.strictEqual((await fetch(base + '/devices/NOPE')).status, 404);
}));
