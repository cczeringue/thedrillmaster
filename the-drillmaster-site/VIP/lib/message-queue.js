// One timer owns delivery so introductory and interactive replies never overlap.
export function createMessageQueue(deliver, {
  schedule = setTimeout,
  cancel = clearTimeout,
  now = Date.now,
  onPending = (_pending) => {},
} = {}) {
  let items = [];
  let timer = null;
  let stopped = false;
  let current = null;
  let paused = false;
  let remaining = 0;
  let dueAt = 0;

  function next() {
    if (stopped || paused || timer !== null) return;
    if (!current) {
      current = items.shift();
      if (!current) { onPending(false); return; }
      remaining = current.delay ?? 1000;
    }
    const item = current;
    dueAt = now() + remaining;
    onPending(true);
    timer = schedule(() => {
      timer = null;
      current = null;
      remaining = 0;
      if (stopped) return;
      deliver(item);
      next();
    }, remaining);
  }

  return {
    add(...messages) {
      if (stopped) return;
      items.push(...messages);
      next();
    },
    pause() {
      if (stopped || paused) return;
      paused = true;
      if (timer !== null) {
        remaining = Math.max(0, dueAt - now());
        cancel(timer);
        timer = null;
      }
      onPending(false);
    },
    resume() {
      if (stopped || !paused) return;
      paused = false;
      next();
    },
    flush() {
      if (stopped) return;
      if (timer !== null) cancel(timer);
      timer = null;
      const queued = current ? [current, ...items] : items;
      current = null;
      items = [];
      paused = false;
      remaining = 0;
      // Explicit navigation reveals the conversation without a burst of sounds.
      queued.forEach(item => deliver(item, true));
      onPending(false);
    },
    stop() {
      stopped = true;
      items = [];
      if (timer !== null) cancel(timer);
      timer = null;
      current = null;
    },
  };
}
