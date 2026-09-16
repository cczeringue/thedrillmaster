import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submitRsvp, getSubmissionId, clearPendingSubmission } from '../VIP/lib/submit-rsvp.js';
import { handleVipRsvp } from '../server/vip-rsvp.js';

const input = { id: 'd95ffede-21c3-4a11-9b44-d52b5a4359d1', name: 'QA Guest', email: 'qa@example.invalid', guests: 2 };
const receipt = { ok: true, reference: input.id, name: input.name, guests: 2 };
const noWait = async () => {};

test('reload recovery keeps only an opaque pending ID and does not restore guest details', async () => {
  const map = new Map();
  const storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
  const first = await getSubmissionId(input, storage);
  assert.equal(await getSubmissionId(input, storage), first);
  assert.doesNotMatch([...map.values()].join(), /QA Guest|qa@example/);
  clearPendingSubmission('different-id', storage);
  assert.equal(await getSubmissionId(input, storage), first);
  clearPendingSubmission(first, storage);
  assert.notEqual(await getSubmissionId(input, storage), first);
});

test('blocked browser storage cannot prevent an RSVP or turn success into failure', async () => {
  const storage = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); }, removeItem() { throw Error('Blocked'); } };
  assert.match(await getSubmissionId(input, storage), /^[a-f0-9-]{36}$/);
  assert.doesNotThrow(() => clearPendingSubmission(input.id, storage));
});

test('restricted in-app browser sessionStorage getters are also safe', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw Error('SecurityError'); } });
  try {
    assert.match(await getSubmissionId(input), /^[a-f0-9-]{36}$/);
    assert.doesNotThrow(() => clearPendingSubmission(input.id));
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
  }
});

test('a lost response after saving recovers the original receipt without another reservation', async () => {
  const rows = new Map(), bodies = [], progress = [];
  const saved = await submitRsvp(input, { sleep: noWait, onRetry: attempt => progress.push(attempt), fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body); bodies.push(body);
    if (!rows.has(body.id)) rows.set(body.id, receipt);
    if (bodies.length === 1) throw new TypeError('Lost response after save');
    return Response.json(rows.get(body.id), { status: 201 });
  } });
  assert.deepEqual(saved, receipt); assert.equal(rows.size, 1);
  assert.deepEqual(bodies, [input, input]); assert.deepEqual(progress, [2]);
});

test('temporary server failure and malformed success response retry; a different receipt never confirms', async () => {
  let calls = 0;
  const saved = await submitRsvp(input, { sleep: noWait, fetchImpl: async () => {
    calls++;
    if (calls === 1) return Response.json({ error: 'Unverified' }, { status: 503 });
    if (calls === 2) return Response.json({ ...receipt, reference: 'a045a996-cacc-4c6c-8623-f189aa725a64' });
    return Response.json(receipt);
  } });
  assert.equal(saved.reference, input.id); assert.equal(calls, 3);
});

test('validation failures do not retry and outage retries stay bounded', async () => {
  let calls = 0;
  await assert.rejects(submitRsvp(input, { sleep: noWait, fetchImpl: async () => {
    calls++; return Response.json({ error: 'Please check your details.' }, { status: 400 });
  } }), /Please check your details/);
  assert.equal(calls, 1); calls = 0;
  await assert.rejects(submitRsvp(input, { sleep: noWait, fetchImpl: async () => {
    calls++; throw Error('Network secret');
  } }), /try again|retry/i);
  assert.equal(calls, 3);
});

test('a stalled mobile connection times out and retries the same payload', async () => {
  let calls = 0;
  const saved = await submitRsvp(input, { timeoutMs: 5, sleep: noWait, fetchImpl: async (_url, options) => {
    calls++;
    if (calls > 1) return Response.json(receipt);
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted'))));
  } });
  assert.equal(saved.reference, input.id); assert.equal(calls, 2);
});

test('the real API recovers after both Google acknowledgments are lost, storing one reservation', async () => {
  const rows = new Map(), diagnostics = [];
  let storageCalls = 0;
  const env = { VIP_RSVP_SHEETS_URL: 'https://script.google.com/macros/s/test/exec', VIP_RSVP_SHEETS_TOKEN: 'secret' };
  const result = await submitRsvp(input, { sleep: noWait, fetchImpl: async (_url, options) => {
    return handleVipRsvp(new Request('https://www.thedrillmaster.gay/api/vip-rsvp', options), {
      env, logger: { error: (_message, detail) => diagnostics.push(detail) },
      fetchImpl: async (_storageUrl, storageOptions) => {
        const body = JSON.parse(storageOptions.body);
        rows.set(body.id, receipt);
        if (++storageCalls <= 2) throw new TypeError('Google response interrupted after write');
        return Response.json(rows.get(body.id));
      },
    });
  } });
  assert.deepEqual(result, receipt); assert.equal(rows.size, 1); assert.equal(storageCalls, 3);
  assert.equal(diagnostics.length, 2);
  assert.doesNotMatch(JSON.stringify(diagnostics), /secret|QA Guest|qa@example/);
});
