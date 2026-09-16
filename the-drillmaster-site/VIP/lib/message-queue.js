// One timer owns delivery so introductory and interactive replies never overlap.
export function createMessageQueue(deliver, {
  schedule = setTimeout,
  cancel = clearTimeout,
  onPending = (_pending) => {},
} = {}) {
  let items = [];
  let timer = null;
  let stopped = false;
  let current = null;

  function next() {
    if (stopped || timer !== null) return;
    const item = items.shift();
    if (!item) { onPending(false); return; }
    current = item;
    onPending(true);
    timer = schedule(() => {
      timer = null;
      current = null;
      if (stopped) return;
      deliver(item);
      next();
    }, item.delay ?? 1000);
  }

  return {
    add(...messages) {
      if (stopped) return;
      items.push(...messages);
      next();
    },
    flush() {
      if (stopped) return;
      if (timer !== null) cancel(timer);
      timer = null;
      const remaining = current ? [current, ...items] : items;
      current = null;
      items = [];
      // Explicit navigation reveals the conversation without a burst of sounds.
      remaining.forEach(item => deliver(item, true));
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
