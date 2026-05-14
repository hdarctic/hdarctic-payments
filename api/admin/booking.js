// api/admin/booking.js
// GET    /api/admin/booking?id=HDA-0001    get single reservation
// PUT    /api/admin/booking?id=HDA-0001    update (partial allowed)
// DELETE /api/admin/booking?id=HDA-0001    delete

import { requireAuth } from './_auth.js';
import { KV_ENABLED, getItem, saveItem, deleteItem } from './_kv.js';
import { applyUpdate, validate, computeDerived } from './_schema.js';

export default async function handler(req, res) {
  const sess = requireAuth(req, res);
  if (!sess) return;

  if (!KV_ENABLED) {
    return res.status(500).json({ error: 'KV_NOT_CONFIGURED' });
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const id = url.searchParams.get('id') || '';
  if (!id) return res.status(400).json({ error: 'id query param required' });

  if (req.method === 'GET') return get(res, id);
  if (req.method === 'PUT' || req.method === 'PATCH') return update(req, res, id, sess.user);
  if (req.method === 'DELETE') return remove(res, id);

  res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

async function get(res, id) {
  try {
    const r = await getItem(id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ reservation: computeDerived(r) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function update(req, res, id, user) {
  try {
    const existing = await getItem(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid body' });

    const merged = applyUpdate(existing, body);
    const { ok, errors } = validate(merged);
    if (!ok) return res.status(400).json({ error: 'Validation failed', errors });

    merged.updated = Math.floor(Date.now() / 1000);
    merged.updated_by = user;

    await saveItem(id, merged);
    return res.status(200).json({ reservation: computeDerived(merged) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function remove(res, id) {
  try {
    const existing = await getItem(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await deleteItem(id);
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
