/**
 * Vercel discovers serverless routes from the Git repository root.
 * Keep this file self-contained (no cross-folder imports) so NFT bundling works.
 * Env: BREVO_API_KEY (required), BREVO_LIST_ID (optional numeric list id).
 */

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function readBody(req) {
  if (req.body == null || req.body === '') return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
  return req.body;
}

async function subscribeEmail(email, env = process.env) {
  const apiKey = env.BREVO_API_KEY;
  const listId = env.BREVO_LIST_ID ? parseInt(env.BREVO_LIST_ID, 10) : null;

  if (!apiKey) {
    return {
      status: 500,
      body: { error: 'Server misconfiguration: missing BREVO_API_KEY' },
    };
  }

  const normalized = (email || '').trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { status: 400, body: { error: 'Valid email required' } };
  }

  const payload = {
    email: normalized,
    updateEnabled: true,
    ...(listId && listId > 0 ? { listIds: [listId] } : {}),
  };

  const response = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (response.ok) {
    return {
      status: 201,
      body: { success: true, message: 'Friedrich LOVES you!' },
    };
  }

  const message = String(data.message || '');
  const alreadyExists =
    response.status === 400 &&
    (data.code === 'duplicate_parameter' ||
      /already|duplicate/i.test(message));

  if (alreadyExists) {
    return {
      status: 200,
      body: { success: true, message: 'Friedrich LOVES you!' },
    };
  }

  if (/api key is not enabled|unauthori[sz]ed|invalid api key/i.test(message)) {
    return {
      status: 500,
      body: {
        error:
          'Brevo API key is disabled or invalid. Create a new key in Brevo and update BREVO_API_KEY.',
      },
    };
  }

  console.error('Brevo API error', response.status, data);
  return {
    status: response.status >= 500 ? 502 : 400,
    body: { error: data.message || 'Subscription failed. Please try again.' },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = readBody(req);
  } catch {
    return send(res, 400, { error: 'Invalid JSON' });
  }

  const result = await subscribeEmail(body.email);
  return send(res, result.status, result.body);
}
