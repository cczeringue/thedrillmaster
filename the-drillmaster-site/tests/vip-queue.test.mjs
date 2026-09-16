import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMessageQueue } from '../VIP/lib/message-queue.js';

function clock() {
  let time = 0, sequence = 0;
  const timers = new Map();
  return {
    now: () => time,
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

test('opening a panel pauses delivery and resumes the remaining message delay', () => {
  const time = clock(), delivered = [], pending = [];
  const queue = createMessageQueue(message => delivered.push(message.id), { ...time, onPending: value => pending.push(value) });
  queue.add({ id: 'first', delay: 1000 }, { id: 'second', delay: 1200 });
  time.advance(350);
  queue.pause();
  assert.equal(pending.at(-1), false);
  time.advance(20000);
  assert.deepEqual(delivered, []);
  queue.resume();
  assert.equal(pending.at(-1), true);
  time.advance(649);
  assert.deepEqual(delivered, []);
  time.advance(1);
  assert.deepEqual(delivered, ['first']);
  time.advance(1199);
  assert.deepEqual(delivered, ['first']);
  time.advance(1);
  assert.deepEqual(delivered, ['first', 'second']);
  assert.equal(pending.at(-1), false);
});

test('repeated pause or resume calls do not restart or duplicate a message', () => {
  const time = clock(), delivered = [];
  const queue = createMessageQueue(message => delivered.push(message.id), time);
  queue.add({ id: 'poster', delay: 8000 });
  time.advance(3000);
  queue.pause();
  time.advance(1000);
  queue.pause();
  queue.resume();
  queue.resume();
  time.advance(2000);
  queue.pause();
  time.advance(20000);
  queue.resume();
  time.advance(2999);
  assert.deepEqual(delivered, []);
  time.advance(1);
  assert.deepEqual(delivered, ['poster']);
  time.advance(10000);
  assert.deepEqual(delivered, ['poster']);
});

test('messages added while paused wait and keep their original order', () => {
  const time = clock(), delivered = [];
  const queue = createMessageQueue(message => delivered.push(message.id), time);
  queue.pause();
  queue.add({ id: 'first', delay: 1000 });
  queue.add({ id: 'second', delay: 500 });
  time.advance(20000);
  assert.deepEqual(delivered, []);
  queue.resume();
  time.advance(999);
  assert.deepEqual(delivered, []);
  time.advance(1);
  assert.deepEqual(delivered, ['first']);
  time.advance(500);
  assert.deepEqual(delivered, ['first', 'second']);
});

test('skipping while paused flushes silently and leaves confirmation delivery unpaused', () => {
  const time = clock(), delivered = [];
  const queue = createMessageQueue((message, immediate) => delivered.push({ id: message.id, immediate: !!immediate }), time);
  queue.add({ id: 'poster', delay: 1000 }, { id: 'form', delay: 8000 });
  time.advance(500);
  queue.pause();
  queue.flush();
  assert.deepEqual(delivered, [{ id: 'poster', immediate: true }, { id: 'form', immediate: true }]);
  queue.add({ id: 'confirmation', delay: 300 });
  time.advance(299);
  assert.equal(delivered.length, 2);
  time.advance(1);
  assert.deepEqual(delivered.at(-1), { id: 'confirmation', immediate: false });
  queue.resume();
  queue.flush();
  time.advance(20000);
  assert.equal(delivered.length, 3);
});

test('unloading a paused queue prevents later resumes or additions from delivering', () => {
  const time = clock(), delivered = [];
  const queue = createMessageQueue(message => delivered.push(message.id), time);
  queue.add({ id: 'old', delay: 1000 });
  time.advance(100);
  queue.pause();
  queue.stop();
  queue.resume();
  queue.pause();
  queue.add({ id: 'later', delay: 1000 });
  queue.flush();
  time.advance(20000);
  assert.deepEqual(delivered, []);
});
