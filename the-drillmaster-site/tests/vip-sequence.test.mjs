import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMessageQueue } from '../VIP/lib/message-queue.js';

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
