export async function saveToGoogleSheet(input, { env, fetchImpl = fetch }) {
  const url = new URL(env.VIP_RSVP_SHEETS_URL);
  if (url.origin !== 'https://script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname) ||
      url.search || !env.VIP_RSVP_SHEETS_TOKEN) throw new Error('Sheet connection is not configured.');

  const signal = AbortSignal.timeout(20000);
  let response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, token: env.VIP_RSVP_SHEETS_TOKEN }),
    redirect: 'manual', signal,
  });
  // Apps Script serves JSON through one Google-controlled redirect. Send no secret on that GET.
  if (response.status === 302 || response.status === 303) {
    const location = new URL(response.headers.get('location'));
    if (location.origin !== 'https://script.googleusercontent.com') throw new Error('Unexpected storage redirect.');
    response = await fetchImpl(location.toString(), { method: 'GET', redirect: 'error', signal });
  }
  return response;
}
