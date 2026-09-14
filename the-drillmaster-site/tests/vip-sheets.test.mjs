import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { handleVipRsvp } from '../server/vip-rsvp.js';

const input = { id: 'c893872e-6b76-4709-b74d-e5f377c040db', name: 'A Guest', email: 'guest@example.invalid', guests: 2 };
const receipt = { ok: true, reference: input.id, name: input.name, guests: 2 };
const env = { VIP_RSVP_SHEETS_URL: 'https://script.google.com/macros/s/test-deployment/exec', VIP_RSVP_SHEETS_TOKEN: 'test-token' };
const request = () => new Request('https://www.thedrillmaster.gay/api/vip-rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });

test('Sheets receives normalized fields and returns a verified receipt through its Google redirect', async () => {
  let calls = 0;
  const response = await handleVipRsvp(request(), { env, fetchImpl: async (url, options) => {
    calls++;
    if (calls === 1) {
      assert.equal(url, env.VIP_RSVP_SHEETS_URL);
      assert.deepEqual(JSON.parse(options.body), { ...input, token: env.VIP_RSVP_SHEETS_TOKEN });
      assert.equal(options.redirect, 'manual');
      return new Response(null, { status: 302, headers: { Location: 'https://script.googleusercontent.com/macros/echo?key=test' } });
    }
    assert.equal(options.method, 'GET');
    assert.equal(options.body, undefined);
    assert.equal(options.headers, undefined);
    return Response.json(receipt);
  } });
  assert.equal(calls, 2); assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), receipt);
});

test('Sheets failures and unexpected redirects fail closed without falling back to a different database', async () => {
  for (const fetchImpl of [
    async () => Response.json({ ok: false, error: 'Unauthorized' }),
    async () => new Response(null, { status: 302, headers: { Location: 'https://elsewhere.invalid/' } }),
    async () => new Response('<html>Sign in</html>'),
  ]) assert.equal((await handleVipRsvp(request(), { env: { ...env, VIP_RSVP_UPSTREAM_TOKEN: 'old-token' }, fetchImpl })).status, 503);
  assert.equal((await handleVipRsvp(request(), { env: { VIP_RSVP_SHEETS_URL: env.VIP_RSVP_SHEETS_URL }, fetchImpl: () => { throw Error('Unexpected call'); } })).status, 503);
});

test('a transient Sheets response retries the same UUID only once', async () => {
  const requests = [];
  const response = await handleVipRsvp(request(), { env, fetchImpl: async (_url, options) => {
    requests.push(JSON.parse(options.body));
    if (requests.length === 1) throw new TypeError('Network response interrupted after save');
    return Response.json(receipt);
  } });
  assert.equal(response.status, 201);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  let attempts = 0;
  const unavailable = await handleVipRsvp(request(), { env, fetchImpl: async () => {
    attempts++;
    throw new TypeError('Network unavailable');
  } });
  assert.equal(attempts, 2);
  assert.equal(unavailable.status, 503);
});

function fixture() {
  const rows = [['Name', 'Email', 'Tickets needed', 'Received at', 'RSVP reference']];
  let writes = 0, locked = false;
  const sheet = {
    getLastRow: () => rows.length, getMaxRows: () => 1000,
    getRange(row, col, count) {
      return {
        getValues: () => rows.slice(row - 1, row - 1 + count),
        getDisplayValues: () => rows.slice(row - 1, row - 1 + count),
        setValues(values) { assert.equal(locked, true); rows.splice(row - 1, values.length, ...values); writes++; },
        createTextFinder(id) { return { matchEntireCell: () => ({ findNext: () => {
          const found = rows.findIndex(values => values[4] === id);
          return found > 0 ? { getRow: () => found + 1 } : null;
        } }) }; },
      };
    },
  };
  const properties = new Map();
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key) ?? null, setProperty: (key, value) => properties.set(key, value) }) },
    console: { log() {}, error() {} },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (_algorithm, text) => [...createHash('sha256').update(text).digest()] },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() { locked = true; }, hasLock: () => locked, releaseLock() { locked = false; } }) },
  });
  const code = readFileSync(new URL('../../integrations/google-sheets/Code.gs', import.meta.url), 'utf8');
  vm.runInContext(code, context);
  context.RSVP_TOKEN_SHA256 = createHash('sha256').update('test-token').digest('hex');
  const post = data => context.doPost({ postData: { contents: JSON.stringify(data) } });
  return { rows, post, context, writes: () => writes };
}

test('the Apps Script writer persists once under a lock and reuses the receipt on retry', () => {
  const f = fixture();
  assert.deepEqual(f.post({ ...input, token: 'test-token' }), receipt);
  assert.deepEqual(f.post({ ...input, name: 'Changed on retry', guests: 1, token: 'test-token' }), receipt);
  assert.equal(f.writes(), 1);
  assert.equal(f.rows[1][1], input.email);
  assert.equal(f.rows[1][2], 2);
  assert.ok(f.rows[1][3]);
});

test('the sheet writer rejects unauthorized/oversized parties and escapes formulas', () => {
  const f = fixture();
  assert.equal(f.post({ ...input, token: 'bad-token' }).ok, false);
  assert.equal(f.post({ ...input, guests: 3, token: 'test-token' }).ok, false);
  assert.equal(f.writes(), 0);
  assert.equal(f.post({ ...input, name: '=IMPORTXML("https://bad.invalid", "//a")', token: 'test-token' }).ok, true);
  assert.match(f.rows[1][0], /^'=/);
  assert.equal(f.context.doGet().ok, false);
});

const claimId = 'f4e75baa-41cc-426b-95f3-088f7c2b3827';
test('email claims use stored recipient details and persist delivery without changing RSVP rows', () => {
 const f=fixture(); f.post({...input,token:'test-token'});
 const claim=f.post({action:'claim-email',id:input.id,claimId,token:'test-token'});
 assert.equal(claim.status,'claimed'); assert.equal(claim.email,input.email);
 assert.equal(f.post({action:'claim-email',id:input.id,claimId:'7405f244-ed97-4b94-88b7-b057db195c20',token:'test-token'}).status,'pending');
 assert.equal(f.post({action:'claim-email',id:input.id,claimId,token:'test-token'}).status,'claimed');
 assert.equal(f.post({action:'finish-email',id:input.id,claimId,status:'sent',messageId:'<mail@example.invalid>',token:'test-token'}).status,'sent');
 assert.equal(f.post({action:'claim-email',id:input.id,claimId,token:'test-token'}).status,'sent');
 assert.equal(f.writes(),1); assert.equal(f.rows[1].length,5);
});

test('unauthorized, unknown or mismatched email claims never expose guest data or mark mail sent', () => {
 const f=fixture(); f.post({...input,token:'test-token'});
 assert.equal(f.post({action:'claim-email',id:input.id,claimId,token:'bad'}).ok,false);
 assert.equal(f.post({action:'claim-email',id:claimId,claimId,token:'test-token'}).ok,false);
 f.post({action:'claim-email',id:input.id,claimId,token:'test-token'});
 assert.equal(f.post({action:'finish-email',id:input.id,claimId:input.id,status:'sent',messageId:'fake',token:'test-token'}).ok,false);
});
