// api/admin/concierge.js
// POST  public capture endpoint, called from concierge/groups/incentive forms
//       in the hdarctic.com widget. Creates a reservation with status="New enquiry".
//       NO AUTH — this is the public submit endpoint.

import { KV_ENABLED, nextId, saveItem, indexAdd } from './_kv.js';
import { emptyReservation, applyUpdate, computeDerived } from './_schema.js';

const ALLOWED_TYPES = ['Concierge', 'Groups', 'Incentive', 'Match Day'];

export default async function handler(req, res) {
  // Permissive CORS so it can be called from hdarctic.com directly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid body' });
  if (!body.email) return res.status(400).json({ error: 'Email required' });

  // Map public form payload to our reservation schema
  const sourceLabel = ALLOWED_TYPES.includes(body.type) ? body.type : 'Concierge';
  const patch = {
    status: 'New enquiry',
    source: sourceLabel,
    guest_name: body.name || '',
    email: body.email || '',
    phone: body.phone || '',
    adults: Number(body.adults) || 0,
    children: Number(body.children) || 0,
    arrival: body.arrival || '',
    departure: body.departure || '',
    concierge_brief: body.message || '',
    how_found: 'Direct',
    utm_source: body.utm_source || '',
  };

  // Fail soft if KV is missing — log to Vercel and respond 200 so the form UX still works
  if (!KV_ENABLED) {
    console.warn('[concierge] KV not configured, dropping enquiry:', patch);
    return res.status(200).json({ ok: true, stored: false });
  }

  try {
    const empty = emptyReservation();
    const draft = applyUpdate(empty, patch);
    const now = Math.floor(Date.now() / 1000);
    const id = await nextId();
    const record = {
      ...draft,
      id,
      created: now,
      updated: now,
      created_by: 'public-form',
      updated_by: 'public-form',
    };
    await saveItem(id, record);
    await indexAdd(id, now);
    return res.status(200).json({ ok: true, stored: true, id });
  } catch (e) {
    console.error('[concierge] capture failed:', e);
    return res.status(500).json({ error: e.message });
  }
}
