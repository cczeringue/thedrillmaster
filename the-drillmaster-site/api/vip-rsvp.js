import { handleVipRsvp } from '../server/vip-rsvp.js';
import { waitUntil } from '@vercel/functions';

export default async function handler(req, res) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }
  const protocol = req.headers['x-forwarded-proto'] === 'http' ? 'http' : 'https';
  const url = `${protocol}://${req.headers.host}${req.url}`;
  const options = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    options.body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body ?? {});
  }
  const response = await handleVipRsvp(new Request(url, options), { waitUntil });
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await response.text());
}
