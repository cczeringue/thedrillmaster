import { rsvpSchema, rsvpReceiptSchema } from '../VIP/lib/rsvp-validation.js';
import { saveToGoogleSheet } from './sheets-rsvp.js';

const UPSTREAM = 'https://drillmaster-vip-chat.cbiscuit.chatgpt.site/api/rsvp';
const MAX_BYTES = 4096;
const unavailable = 'Your RSVP has not been verified. Please try again in a moment.';

function json(body, status, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      ...headers,
    },
  });
}

// Google Sheets is authoritative when configured. Preserve the original backend during setup.
// The endpoint can submit a request, never read the guest list or proxy other URLs.
export async function handleVipRsvp(request, { env = process.env, fetchImpl = fetch } = {}) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
      (origin && origin !== new URL(request.url).origin)) {
    return json({ error: 'Please send your RSVP from this website.' }, 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Please send your RSVP as JSON.' }, 415);
  }
  if (Number(request.headers.get('content-length')) > MAX_BYTES) {
    return json({ error: 'Your RSVP is too large.' }, 413);
  }

  let input;
  try {
    const reader = request.body?.getReader();
    const chunks = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return json({ error: 'Your RSVP is too large.' }, 413);
        }
        chunks.push(value);
      }
    }
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return json({ error: 'Please check your RSVP details.' }, 400);
  }
  const parsed = rsvpSchema.safeParse(input);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Please check your details.' }, 400);
  if (!env.VIP_RSVP_SHEETS_URL && !env.VIP_RSVP_UPSTREAM_TOKEN) return json({ error: unavailable }, 503);

  // A transient Google response can fail after the row was written. Retry once
  // with the same UUID so the writer returns the original receipt without a second row.
  const attempts = env.VIP_RSVP_SHEETS_URL ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) try {
    const response = env.VIP_RSVP_SHEETS_URL
      ? await saveToGoogleSheet(parsed.data, { env, fetchImpl })
      : await fetchImpl(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OAI-Sites-Authorization': `Bearer ${env.VIP_RSVP_UPSTREAM_TOKEN}`,
      },
      body: JSON.stringify(parsed.data),
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const saved = rsvpReceiptSchema.safeParse(await response.json());
    if (!response.ok || !saved.success || saved.data.reference !== parsed.data.id) {
      continue;
    }
    // Both storage endpoints return the actual stored receipt on an idempotent retry.
    return json(saved.data, 201);
  } catch { /* Retry the same request, then report an unverified save. */ }
  return json({ error: unavailable }, 503);
}
