// api/admin/schema.js
// GET /api/admin/schema   returns dropdown options used by the frontend forms.

import { requireAuth } from './_auth.js';
import {
  PACKAGES, ROOMS, STATUSES, SOURCES, LANGUAGES, COUNTRIES,
  ACTIVITIES, RATES, HANDLED_BY, HOW_FOUND, HOTELS,
} from './_schema.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const sess = requireAuth(req, res);
  if (!sess) return;
  return res.status(200).json({
    packages: PACKAGES,
    rooms: ROOMS,
    statuses: STATUSES,
    sources: SOURCES,
    languages: LANGUAGES,
    countries: COUNTRIES,
    activities: ACTIVITIES,
    rates: RATES,
    handled_by: HANDLED_BY,
    how_found: HOW_FOUND,
    hotels: HOTELS,
  });
}
