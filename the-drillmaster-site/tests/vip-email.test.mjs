import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { handleVipRsvp } from '../server/vip-rsvp.js';
const guest = { id: 'cb633ade-bb39-44f3-a368-159a66b410b3', name: '<Guest & Friend>', email: 'guest@example.invalid', guests: 2 };
const receipt = { ok: true, reference: guest.id, name: guest.name, guests: 2 };
const env = { VIP_RSVP_SHEETS_URL: 'https://script.google.com/macros/s/test/exec', VIP_RSVP_SHEETS_TOKEN: 'sheet-token', BREVO_API_KEY: 'mail-token' };
const req = () => new Request('https://www.thedrillmaster.gay/api/vip-rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(guest) });

test('email follows the verified save and uses the stored recipient with an escaped branded invitation', async () => {
 const calls = [];
 const response = await handleVipRsvp(req(), { env, fetchImpl: async (url, options) => {
  const body = JSON.parse(options.body); calls.push(body);
  if (url.includes('script.google.com')) {
   if (body.action === 'claim-email') return Response.json({ ok: true, status: 'claimed', reference: guest.id, name: guest.name, email: 'stored@example.invalid', guests: 2 });
   if (body.action === 'finish-email') return Response.json({ ok: true, status: 'sent' });
   return Response.json(receipt);
  }
  assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(options.headers['api-key'], 'mail-token');
  assert.deepEqual(body.to, [{ email: 'stored@example.invalid', name: guest.name }]);
  assert.equal(body.replyTo.email, 'thedrillmasterplay@gmail.com');
  assert.match(body.subject, /Creator.s list/);
  assert.match(body.htmlContent, /&lt;Guest &amp; Friend&gt;/);
  assert.doesNotMatch(body.htmlContent, /<Guest/);
  for (const value of ['2 tickets', 'no charge', '7:30 PM', '7:00 PM', '1944 Riverside', 'Developmental preview', 'Add to calendar', 'elysian-announcement', 'Jenny Zigrino', 'Jeffrey Jay']) assert.ok(body.htmlContent.includes(value), value);
  assert.match(body.textContent, /https:\/\/www.thedrillmaster.gay\//);
  assert.match(body.textContent, /https:\/\/www.elysiantheater.com\/shows\/thedrillmaster1013/);
  assert.equal(body.headers.idempotencyKey, guest.id);
  const calendar = Buffer.from(body.attachment[0].content, 'base64').toString();
  assert.match(calendar, /DTSTART:20261014T023000Z/);
  assert.match(calendar, /DTEND:20261014T034500Z/);
  assert.match(calendar, /no charge/);
  assert.doesNotMatch(calendar, /confirm availability|request and/);
  return Response.json({ messageId: '<confirmation@example.invalid>' }, { status: 201 });
 } });
 const result = await response.json();
 assert.equal(result.emailStatus, 'sent');
 assert.equal(result.email, undefined);
 assert.equal(calls[0].action, undefined);
 assert.equal(calls[1].action, 'claim-email');
 assert.equal(calls.at(-1).action, 'finish-email');
 assert.equal(calls.at(-1).status, 'sent');
});

test('previously sent receipts do not send another email', async () => {
 let sends=0;
 const response=await handleVipRsvp(req(), {env,fetchImpl:async(url,options)=>{
  if (url.includes('brevo')) { sends++; throw Error('Duplicate send'); }
  const body=JSON.parse(options.body);
  return Response.json(body.action ? {ok:true,status:'sent'} : receipt);
 }});
 assert.equal((await response.json()).emailStatus,'sent'); assert.equal(sends,0);
});

test('email rejection preserves the saved RSVP and records the failure', async () => {
 const records=[];
 const response=await handleVipRsvp(req(), {env,fetchImpl:async(url,options)=>{
  const body=JSON.parse(options.body);
  if (url.includes('brevo')) return Response.json({code:'invalid_parameter',message:'sender secret detail'}, {status:400});
  if (body.action==='claim-email') return Response.json({ok:true,status:'claimed',reference:guest.id,...guest});
  if (body.action==='finish-email') { records.push(body); return Response.json({ok:true,status:body.status}); }
  return Response.json(receipt);
 }});
 assert.equal(response.status,201);
 const result=await response.json(); assert.equal(result.emailStatus,'failed'); assert.equal(records[0].status,'failed');
 assert.doesNotMatch(JSON.stringify(result),/secret|mail-token/);
});

test('uncertain email delivery retries with the same provider key and accepts a deduplication receipt', async () => {
 const keys=[];
 const response=await handleVipRsvp(req(),{env,fetchImpl:async(url,options)=>{
  const body=JSON.parse(options.body);
  if(url.includes('brevo')) { keys.push(body.headers.idempotencyKey); if(keys.length===1) throw Error('Response lost'); return Response.json({code:'duplicate_parameter',message:'Email for the idempotency key has already been processed'},{status:400}); }
  if(body.action==='claim-email') return Response.json({ok:true,status:'claimed',reference:guest.id,...guest});
  return Response.json(body.action?{ok:true,status:'sent'}:receipt);
 }});
 assert.equal((await response.json()).emailStatus,'sent'); assert.deepEqual(keys,[guest.id,guest.id]);
});

test('unverified storage never sends an email', async () => {
 let sends=0;
 const response=await handleVipRsvp(req(),{env,fetchImpl:async(url)=>{ if(url.includes('brevo'))sends++; return Response.json({ok:false}); }});
 assert.equal(response.status,503);assert.equal(sends,0);
});

test('the downloadable calendar includes the confirmed Creator list and free door tickets', () => {
 const calendar=readFileSync(new URL('../public/VIP/assets/the-drillmaster.ics',import.meta.url),'utf8').replace(/\r?\n /g,'');
 assert.match(calendar,/no charge/);assert.doesNotMatch(calendar,/confirm availability/);
});

test('production confirms the saved reservation while email is still running', async () => {
 let release;
 const held = new Promise(resolve => { release = resolve; });
 const background = [];
 const responsePromise = handleVipRsvp(req(), { env, waitUntil: task => background.push(task), fetchImpl: async (_url, options) => {
   const body = JSON.parse(options.body);
   if (body.action) { await held; return Response.json({ ok: true, status: 'sent' }); }
   return Response.json(receipt);
 } });
 const result = await Promise.race([responsePromise, new Promise(resolve => setTimeout(() => resolve(null), 50))]);
 release();
 await Promise.all(background);
 assert.ok(result, 'Saved RSVP must not wait for email');
 assert.equal(result.status, 201);
 assert.equal((await result.json()).emailStatus, 'pending');
 assert.equal(background.length, 1);
});
