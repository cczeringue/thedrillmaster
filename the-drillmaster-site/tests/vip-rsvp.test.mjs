import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleVipRsvp } from '../server/vip-rsvp.js';
import handler from '../api/vip-rsvp.js';

const guest = { id: 'a045a996-cacc-4c6c-8623-f189aa725a64', name: ' Test Guest ', email: ' TEST@example.invalid ', guests: 2 };
const env = { VIP_RSVP_UPSTREAM_TOKEN: 'test-only-secret' };
const receipt = { ok: true, reference: guest.id, name: 'Test Guest', guests: 2 };
function request(body = guest, headers = {}) {
  return new Request('https://www.thedrillmaster.gay/api/vip-rsvp', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

test('valid RSVP uses the fixed authenticated storage endpoint and returns only its verified receipt', async () => {
  const response = await handleVipRsvp(request(), { env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://drillmaster-vip-chat.cbiscuit.chatgpt.site/api/rsvp');
    assert.equal(options.headers['OAI-Sites-Authorization'], 'Bearer test-only-secret');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), { ...guest, name: 'Test Guest', email: 'test@example.invalid' });
    return Response.json({ ...receipt, email: 'private@example.invalid', token: 'never forward' }, { status: 201 });
  } });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  assert.deepEqual(await response.json(), receipt);
});

test('a retry keeps the same UUID and returns the original stored name and party size', async () => {
  const seen = [];
  const fetchImpl = async (_url, options) => {
    seen.push(JSON.parse(options.body).id);
    return Response.json(receipt, { status: 201 });
  };
  await handleVipRsvp(request(), { env, fetchImpl });
  const retry = await handleVipRsvp(request({ ...guest, name: 'Changed', guests: 1 }), { env, fetchImpl });
  assert.deepEqual(seen, [guest.id, guest.id]);
  assert.deepEqual(await retry.json(), receipt);
});

test('invalid input is rejected before storage', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw Error('Unexpected storage call'); };
  for (const body of [
    { ...guest, id: 'invalid' }, { ...guest, name: ' ' }, { ...guest, name: 'x'.repeat(101) },
    { ...guest, email: 'not-an-email' }, { ...guest, guests: 0 }, { ...guest, guests: 3 },
    { ...guest, guests: 1.5 }, { ...guest, guests: '2' }, { ...guest, status: 'confirmed' },
  ]) assert.equal((await handleVipRsvp(request(body), { env, fetchImpl })).status, 400);
  assert.equal(calls, 0);
});

test('cross-site requests, oversized bodies, wrong methods and formats are rejected', async () => {
  const options = { env, fetchImpl: () => { throw Error('Unexpected storage call'); } };
  for (const [req, status] of [
    [request(guest, { 'Sec-Fetch-Site': 'cross-site' }), 403],
    [request(guest, { Origin: 'https://elsewhere.invalid' }), 403],
    [request(guest, { 'Content-Type': 'text/plain' }), 415],
    [request(guest, { 'Content-Length': '5000' }), 413],
    [request({ ...guest, name: '😀'.repeat(1500) }), 413],
    [new Request('https://www.thedrillmaster.gay/api/vip-rsvp'), 405],
    [new Request('https://www.thedrillmaster.gay/api/vip-rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), 400],
  ]) assert.equal((await handleVipRsvp(req, options)).status, status);
});

test('missing credentials, network errors, auth pages and invalid receipts never confirm an RSVP', async () => {
  assert.equal((await handleVipRsvp(request(), { env: {}, fetchImpl: () => { throw Error('Unexpected call'); } })).status, 503);
  for (const fetchImpl of [
    async () => { throw Error('Network failed with secret'); },
    async () => new Response('<html>Sign in</html>'),
    async () => Response.json({ ok: true }),
    async () => Response.json({ ...receipt, reference: '17e9723f-1d1c-40fd-abcb-a224df029e89' }),
    async () => Response.json(receipt, { status: 503 }),
  ]) {
    const response = await handleVipRsvp(request(), { env, fetchImpl });
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.equal(data.ok, undefined);
    assert.doesNotMatch(JSON.stringify(data), /secret|Sign in/);
  }
});

test('Vercel adapter returns method and cache headers', async () => {
  const headers = {};
  let body;
  const res = { setHeader(key, value) { headers[key] = value; }, end(value) { body = value; } };
  await handler({ method: 'GET', url: '/api/vip-rsvp', headers: { host: 'www.thedrillmaster.gay' } }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(headers.allow, 'POST');
  assert.equal(headers['cache-control'], 'no-store');
  assert.equal(JSON.parse(body).error, 'Method not allowed.');
});
