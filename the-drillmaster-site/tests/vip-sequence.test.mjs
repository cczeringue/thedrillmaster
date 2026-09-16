import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMessageQueue } from '../VIP/lib/message-queue.js';
import { INTRO_MESSAGES } from '../VIP/lib/intro-messages.js';

function clock() {
  let time = 0, sequence = 0;
  const timers = new Map();
  return {
    schedule(callback, delay) { const id = ++sequence; timers.set(id, { callback, at: time + delay }); return id; },
    cancel(id) { timers.delete(id); },
    advance(ms) {
      const end = time + ms;
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        time = next[1].at; timers.delete(next[0]); next[1].callback();
      }
      time = end;
    },
  };
}

test('messages arrive individually, including replies added while the intro plays', () => {
  const time = clock(), shown = [], pending = [];
  const queue = createMessageQueue(message => shown.push(message.id), { ...time, onPending: value => pending.push(value) });
  queue.add({ id: 'first', delay: 600 }, { id: 'second', delay: 1000 });
  time.advance(599); assert.deepEqual(shown, []);
  time.advance(1); assert.deepEqual(shown, ['first']);
  queue.add({ id: 'reply', delay: 900 });
  time.advance(1000); assert.deepEqual(shown, ['first', 'second']);
  time.advance(899); assert.deepEqual(shown, ['first', 'second']);
  time.advance(1); assert.deepEqual(shown, ['first', 'second', 'reply']);
  assert.equal(pending.at(-1), false);
});

test('unloading cancels pending delivery and a new load starts from the first message', () => {
  const time = clock(), shown = [];
  const first = createMessageQueue(message => shown.push(message.id), time);
  first.add({ id: 'old', delay: 1000 }); first.stop();
  time.advance(2000); assert.deepEqual(shown, []);
  const fresh = createMessageQueue(message => shown.push(message.id), time);
  fresh.add({ id: 'intro-1', delay: 600 });
  time.advance(600); assert.deepEqual(shown, ['intro-1']);
});

test('jumping to RSVP reveals the remaining intro immediately and never delivers it twice', () => {
  const time = clock(), shown = [], pending = [];
  const queue = createMessageQueue((message, immediate) => shown.push({ id: message.id, immediate: !!immediate }), { ...time, onPending: value => pending.push(value) });
  queue.add({ id: 'first', delay: 300 }, { id: 'poster', delay: 500 }, { id: 'rsvp-panel', delay: 2000 });
  time.advance(300);
  queue.flush();
  assert.deepEqual(shown, [
    { id: 'first', immediate: false },
    { id: 'poster', immediate: true },
    { id: 'rsvp-panel', immediate: true },
  ]);
  assert.equal(pending.at(-1), false);
  queue.flush();
  time.advance(10000);
  assert.equal(shown.length, 3);
});

test('jumping past the intro leaves the queue usable for a later confirmation', () => {
  const time = clock(), shown = [];
  const queue = createMessageQueue(message => shown.push(message.id), time);
  queue.add({ id: 'rsvp-panel', delay: 7000 });
  queue.flush();
  queue.add({ id: 'confirmation', delay: 300 });
  time.advance(300);
  assert.deepEqual(shown, ['rsvp-panel', 'confirmation']);
});

test('a stopped queue cannot reveal old messages through a toolbar jump', () => {
  const time = clock(), shown = [];
  const queue = createMessageQueue(message => shown.push(message.id), time);
  queue.add({ id: 'old', delay: 500 });
  queue.stop();
  queue.flush();
  time.advance(1000);
  assert.deepEqual(shown, []);
});

test('the intro uses a readable chat pace, with a longer poster beat before the form', () => {
  const time = clock(), shown = [];
  const queue = createMessageQueue(message => shown.push(message), time);
  queue.add(...INTRO_MESSAGES);
  time.advance(599);
  assert.equal(shown.length, 0);
  time.advance(1);
  assert.equal(shown.length, 1);
  time.advance(7000);
  assert.equal(shown.some(message => message.rsvp), false, 'The normal chat must not rush through in seven seconds');
  assert.equal(shown.at(-1)?.invitation, true);
  time.advance(7300);
  assert.equal(shown.at(-1)?.invitation, true, 'The poster gets an uninterrupted reading beat');
  time.advance(8700);
  assert.equal(shown.at(-1)?.id, 'rsvp-panel');
  assert.equal(shown.at(-1)?.rsvp, true);
  assert.equal(new Set(shown.map(message => message.id)).size, shown.length);
  assert.ok(shown.find(message => message.invitation));
});
