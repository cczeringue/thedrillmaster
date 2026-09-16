import { rsvpReceiptSchema } from './rsvp-validation.js';

const PENDING_KEY = 'drillmaster-vip-pending-v1';
const unavailable = 'We couldn’t confirm your reservation yet. Your details are still here. Please try again safely, or email thedrillmasterplay@gmail.com for help.';

function browserStorage() {
  try { return globalThis.sessionStorage; } catch { return undefined; }
}

// Keep only an opaque fingerprint and UUID, never names/emails or a restored chat.
// If a mobile browser reloads after losing a response, re-entering the same details
// recovers the existing row instead of creating another reservation.
export async function getSubmissionId(details, storage = browserStorage()) {
  const bytes = new TextEncoder().encode(JSON.stringify([details.name.trim(), details.email.trim().toLowerCase(), Number(details.guests)]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    const pending = JSON.parse(storage?.getItem(PENDING_KEY) || 'null');
    if (pending?.fingerprint === fingerprint && /^[a-f0-9-]{36}$/i.test(pending.id)) return pending.id;
  } catch { /* Storage can be unavailable in private/in-app browsers. */ }
  const id = crypto.randomUUID();
  try { storage?.setItem(PENDING_KEY, JSON.stringify({ fingerprint, id })); } catch { /* In-memory retries still work. */ }
  return id;
}

export function clearPendingSubmission(id, storage = browserStorage()) {
  try {
    if (JSON.parse(storage?.getItem(PENDING_KEY) || 'null')?.id === id) storage.removeItem(PENDING_KEY);
  } catch { /* A blocked storage API must not turn success into an error. */ }
}

export async function submitRsvp(input, {
  fetchImpl = fetch, timeoutMs = 45000,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  onRetry = (_attempt) => {},
} = {}) {
  const body = JSON.stringify(input);
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) { onRetry(attempt + 1); await sleep(attempt * 1000); }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let permanentError;
    try {
      const response = await fetchImpl('/api/vip-rsvp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body, signal: controller.signal, cache: 'no-store',
      });
      const result = await response.json().catch(() => null);
      const saved = rsvpReceiptSchema.safeParse(result);
      if (response.ok && saved.success && saved.data.reference === input.id) return saved.data;
      if (response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status)) {
        permanentError = new Error(typeof result?.error === 'string' ? result.error : 'Please check your details and try again.');
      }
    } catch { /* Lost acknowledgments are recovered by repeating the same UUID. */ }
    finally { clearTimeout(timeout); }
    if (permanentError) throw permanentError;
  }
  throw new Error(unavailable);
}
