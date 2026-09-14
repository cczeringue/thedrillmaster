// One timer owns delivery so introductory and interactive replies never overlap.
export function createMessageQueue(deliver, {
  schedule = setTimeout,
  cancel = clearTimeout,
  onPending = (_pending) => {},
} = {}) {
  let items = [];
  let timer = null;
  let stopped = false;

  function next() {
    if (stopped || timer !== null) return;
    const item = items.shift();
    if (!item) { onPending(false); return; }
    onPending(true);
    timer = schedule(() => {
      timer = null;
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
    stop() {
      stopped = true;
      items = [];
      if (timer !== null) cancel(timer);
      timer = null;
    },
  };
}
