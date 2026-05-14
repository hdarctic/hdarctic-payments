// api/admin/me.js
// GET -> { user } if authenticated, 401 otherwise. Used by the frontend to check session on load.

import { readCookie, verify, COOKIE_NAME } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = readCookie(req, COOKIE_NAME);
  const session = verify(token);
  if (!session || !session.user) return res.status(401).json({ error: 'Not authenticated' });
  return res.status(200).json({ user: session.user, exp: session.exp });
}
