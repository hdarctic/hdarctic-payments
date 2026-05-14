// api/admin/auth.js
// POST { name, password } -> sets HTTPOnly session cookie if password matches ADMIN_PASSWORD.

import { sign, setSessionCookie, COOKIE_MAX_AGE_SECONDS } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const name = (body?.name || '').toString().trim();
  const password = (body?.password || '').toString();

  if (!name) return res.status(400).json({ error: 'Name required' });
  if (!password) return res.status(400).json({ error: 'Password required' });

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
  }

  // Constant-time compare
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const crypto = await import('node:crypto');
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SECONDS;
  const token = sign({ user: name, exp });
  setSessionCookie(res, token);
  return res.status(200).json({ ok: true, user: name });
}
