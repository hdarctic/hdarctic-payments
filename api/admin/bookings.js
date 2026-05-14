// api/admin/bookings.js
// GET  /api/admin/bookings           list all reservations (KV-backed)
// POST /api/admin/bookings           create a new reservation

import { requireAuth } from './_auth.js';
import { KV_ENABLED, nextId, saveItem, indexAdd, listIds, mget } from './_kv.js';
import { emptyReservation, applyUpdate, validate, computeDerived } from './_schema.js';

export default async function handler(req, res) {
  const sess = requireAuth(req, res);
  if (!sess) return;

  if (!KV_ENABLED) {
    return res.status(500).json({
      error: 'KV_NOT_CONFIGURED',
      hint: 'Add Vercel KV to this project and set KV_REST_API_URL + KV_REST_API_TOKEN env vars.',
    });
  }

  if (req.method === 'GET') return list(req, res);
  if (req.method === 'POST') return create(req, res, sess.user);

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

async function list(req, res) {
  try {
    const ids = await listIds({ limit: 500 });
    const items = (await mget(ids)).filter(Boolean).map(computeDerived);
    return res.status(200).json({ reservations: items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function create(req, res, user) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid body' });

  const empty = emptyReservation();
  const draft = applyUpdate(empty, body);
  const { ok, errors } = validate(draft);
  if (!ok) return res.status(400).json({ error: 'Validation failed', errors });

  const now = Math.floor(Date.now() / 1000);
  const id = await nextId();
  const record = {
    ...draft,
    id,
    created: now,
    updated: now,
    created_by: user,
    updated_by: user,
  };

  try {
    await saveItem(id, record);
    await indexAdd(id, now);
    return res.status(201).json({ reservation: computeDerived(record) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
