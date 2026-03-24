/**
 * Vercel serverless function: subscribe email to Brevo list.
 * Set env: BREVO_API_KEY, BREVO_LIST_ID (numeric list ID from Brevo dashboard).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID, 10) : null;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: missing BREVO_API_KEY' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const payload = {
    email,
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
    return res.status(201).json({ success: true, message: "Friedrich LOVES you!" });
  }

  if (response.status === 400 && (data.code === 'duplicate_parameter' || data.message?.toLowerCase?.().includes('already'))) {
    return res.status(200).json({ success: true, message: "Friedrich LOVES you!" });
  }

  console.error('Brevo API error', response.status, data);
  return res.status(response.status >= 500 ? 502 : 400).json({
    error: data.message || 'Subscription failed. Please try again.',
  });
}
