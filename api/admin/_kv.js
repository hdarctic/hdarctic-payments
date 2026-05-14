// api/admin/_kv.js
// Vercel KV (Upstash-compatible REST) helpers for reservation storage.

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

export const KV_ENABLED = !!(KV_URL && KV_TOKEN);

export const KEYS = {
  item: (id) => `reservation:item:${id}`,
  index: 'reservation:index',           // sorted set, score = created (unix sec), member = id
  counter: 'reservation:counter',       // for HDA-#### numbering
};

async function kv(pathParts, init = {}) {
  if (!KV_ENABLED) throw new Error('KV_NOT_CONFIGURED');
  const url = `${KV_URL}/${pathParts.map(encodeURIComponent).join('/')}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`KV ${resp.status}: ${text}`);
  try { return JSON.parse(text); } catch (_) { return { result: text }; }
}

export async function nextId() {
  const r = await kv(['incr', KEYS.counter]);
  const n = Number(r.result || 0);
  return `HDA-${String(n).padStart(4, '0')}`;
}

export async function saveItem(id, obj) {
  await kv(['set', KEYS.item(id)], {
    method: 'POST',
    body: JSON.stringify({ value: JSON.stringify(obj) }),
  });
}

export async function getItem(id) {
  const r = await kv(['get', KEYS.item(id)]);
  if (!r.result) return null;
  try { return typeof r.result === 'string' ? JSON.parse(r.result) : r.result; }
  catch (_) { return null; }
}

export async function deleteItem(id) {
  await kv(['del', KEYS.item(id)]);
  await kv(['zrem', KEYS.index, id]);
}

export async function indexAdd(id, score) {
  await kv(['zadd', KEYS.index], {
    method: 'POST',
    body: JSON.stringify({ score, member: id }),
  });
}

export async function listIds({ limit = 500, offset = 0, rev = true } = {}) {
  // Returns most-recent-first by default
  const start = offset;
  const end = offset + limit - 1;
  const path = rev
    ? ['zrange', KEYS.index, String(start), String(end), 'rev']
    : ['zrange', KEYS.index, String(start), String(end)];
  const r = await kv(path);
  return r.result || [];
}

export async function mget(ids) {
  if (!ids.length) return [];
  const keys = ids.map((id) => KEYS.item(id));
  const r = await kv(['mget', ...keys]);
  return (r.result || []).map((raw) => {
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (_) { return null; }
  });
}
