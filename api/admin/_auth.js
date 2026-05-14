// api/admin/_auth.js
// Shared helpers for the admin module: cookie signing, request verification.

import crypto from 'node:crypto';

const COOKIE_NAME = 'hda_admin';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_SECRET env var missing or too short (>= 16 chars required)');
  }
  return secret;
}

export function sign(payload) {
  const secret = getSecret();
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const mac = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${mac}`;
}

export function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return null;
  const data = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const secret = getSecret();
  const expected = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  // Constant-time comparison
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch (_) {
    return null;
  }
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
}

export function readCookie(req, name) {
  const header = req.headers?.cookie || '';
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
  ].join('; '));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Max-Age=0',
  ].join('; '));
}

export function requireAuth(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  const session = verify(token);
  if (!session || !session.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return session;
}

export { COOKIE_NAME, COOKIE_MAX_AGE_SECONDS };
