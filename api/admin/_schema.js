// api/admin/_schema.js
// Reservation schema — fields, validation, defaults. Mirrors the Airtable spec.
// All field names are stable so we can map Stripe webhooks to the same shape later.

export const PACKAGES = [
  'Wild North',
  'Northern Lights & Arctic Adventure',
  'Northern Lights Discovery',
  'Romantic Northern Lights',
  'Sami Reindeer & Northern Lights',
  'Tromsø Family Winter Holiday',
  'Midnight Sun Holiday',
  'Sommarøy Island Escape',
  'Concierge bespoke',
  'Match Day — Standard',
  'Match Day — Forza',
  'Match Day — Northern Match Weekend',
  'Groups bespoke',
  'Incentive bespoke',
];

export const ROOMS = [
  'Standard Room',
  'Superior Room',
  'Premium with Sea & Mountain View',
  'Family Room',
  'Junior Suite',
  'Family Room + Extra Room',
  'Custom (see notes)',
];

export const STATUSES = [
  { value: 'New enquiry', color: '#5a8fb5' },
  { value: 'Confirmed', color: '#c9a961' },
  { value: 'Paid', color: '#7eb88a' },
  { value: 'Cancelled', color: '#6e6e6e' },
  { value: 'Completed', color: '#5fa597' },
  { value: 'Refunded', color: '#c97c61' },
];

export const SOURCES = [
  'Stripe booking',
  'Concierge',
  'Groups',
  'Incentive',
  'Match Day',
  'Phone',
  'Email',
  'Other',
];

export const LANGUAGES = ['English', 'Norwegian', 'German', 'French', 'Spanish', 'Other'];

export const COUNTRIES = [
  'Norway', 'UK', 'US', 'Germany', 'France', 'Sweden', 'Denmark',
  'Netherlands', 'Italy', 'Spain', 'Belgium', 'Switzerland',
  'China', 'Japan', 'South Korea', 'Australia', 'Canada', 'Other',
];

export const ACTIVITIES = [
  // Northern Lights
  { name: 'Aurora Bus Chase', category: 'Northern Lights' },
  { name: 'Aurora Bus Chase — Private', category: 'Northern Lights' },
  { name: 'Aurora Boat Cruise', category: 'Northern Lights' },
  { name: 'Aurora Hot Tub Cruise', category: 'Northern Lights' },
  // Wildlife & Sea
  { name: 'Silent Whale Watching', category: 'Wildlife & Sea' },
  { name: 'Fjord Cruise', category: 'Wildlife & Sea' },
  { name: 'Arctic Floating', category: 'Wildlife & Sea' },
  // Snow & Land
  { name: 'Dog Sledding — Half Day', category: 'Snow & Land' },
  { name: 'Dog Sledding — Full Day', category: 'Snow & Land' },
  { name: 'Snowmobile Lyngen', category: 'Snow & Land' },
  { name: 'ATV Lyngen', category: 'Snow & Land' },
  { name: 'Snowshoeing', category: 'Snow & Land' },
  { name: 'Fatbike', category: 'Snow & Land' },
  // Sami Culture
  { name: 'Sami Reindeer Visit', category: 'Sami Culture' },
  { name: 'Sami Family Dinner', category: 'Sami Culture' },
  // Tromsø Signature
  { name: 'Fjellheisen', category: 'Tromsø Signature' },
  { name: 'Private Pust Session', category: 'Tromsø Signature' },
  { name: 'Mack Brewery', category: 'Tromsø Signature' },
  { name: 'Polaria (day visit)', category: 'Tromsø Signature' },
  // Summer
  { name: 'Kayak Sommarøy', category: 'Summer' },
  { name: 'Midnight Sun Fjord', category: 'Summer' },
  { name: 'E-bike', category: 'Summer' },
  // Match Day
  { name: 'TIL match — Section L (Forza)', category: 'Match Day' },
  { name: 'TIL match — Other section', category: 'Match Day' },
];

export const RATES = ['Pre-paid (15% off)', 'Flex', 'N/A — concierge'];
export const HANDLED_BY = ['William', 'Erlend', 'Both'];
export const HOW_FOUND = [
  'Direct', 'Google search', 'Instagram', 'Referral', 'Press',
  'Partner (Polaria / Best Arctic)', 'Match Day fixture', 'Other',
];

export const HOTELS = ['Radisson Blu Tromsø', 'Other'];

// Empty record with all fields set to safe defaults.
export function emptyReservation() {
  return {
    id: '',
    status: 'New enquiry',
    source: 'Concierge',
    created: 0,
    updated: 0,
    created_by: '',
    updated_by: '',

    // Guest
    guest_name: '',
    email: '',
    phone: '',
    country: '',
    language: 'English',

    // Stay
    package: '',
    hotel: 'Radisson Blu Tromsø',
    room: 'Standard Room',
    arrival: '',
    departure: '',
    adults: 2,
    children: 0,

    // Activities
    activities: [],
    polaria_after_hours: false,
    day_by_day: '',

    // Add-ons
    room_setup: false,
    champagne: false,
    airport_pickup: false,
    extra_nights: 0,
    other_addons: '',

    // Payment
    rate: '',
    total_nok: 0,
    deposit_nok: 0,
    stripe_session_id: '',
    receipt_url: '',
    refund_nok: 0,
    refund_reason: '',

    // Notes
    concierge_brief: '',
    dietary_mobility: '',
    internal_notes: '',
    handled_by: '',

    // Source tracking
    how_found: '',
    referrer_name: '',
    utm_source: '',
  };
}

// Computed helpers — applied to a record before returning it from the API.
export function computeDerived(r) {
  let nights = null;
  if (r.arrival && r.departure) {
    const a = new Date(r.arrival);
    const d = new Date(r.departure);
    if (!isNaN(a) && !isNaN(d)) {
      nights = Math.max(0, Math.round((d - a) / 86400000));
    }
  }
  let season = null;
  if (r.arrival) {
    const m = new Date(r.arrival).getMonth() + 1;
    if (!isNaN(m)) {
      if (m >= 9 || m <= 3) season = 'Aurora season';
      else if (m >= 5 && m <= 7) season = 'Midnight sun';
      else season = 'Shoulder';
    }
  }
  const totalGuests = (Number(r.adults) || 0) + (Number(r.children) || 0);
  return { ...r, _nights: nights, _season: season, _total_guests: totalGuests };
}

// Validate a record before save. Returns { ok, errors }.
export function validate(r) {
  const errors = {};
  if (!r.guest_name && r.status !== 'New enquiry') errors.guest_name = 'Guest name required';
  if (!r.email) errors.email = 'Email required';
  if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) errors.email = 'Invalid email';
  if (r.arrival && r.departure) {
    const a = new Date(r.arrival), d = new Date(r.departure);
    if (!isNaN(a) && !isNaN(d) && d < a) errors.departure = 'Departure before arrival';
  }
  if (r.status && !STATUSES.find((s) => s.value === r.status)) errors.status = 'Unknown status';
  if (r.source && !SOURCES.includes(r.source)) errors.source = 'Unknown source';
  if (r.package && !PACKAGES.includes(r.package)) errors.package = 'Unknown package';
  return { ok: Object.keys(errors).length === 0, errors };
}

// Whitelist fields that can be set from a POST/PUT body — protects against
// the client trying to set id, created, created_by, etc.
const WRITABLE_FIELDS = [
  'status', 'source',
  'guest_name', 'email', 'phone', 'country', 'language',
  'package', 'hotel', 'room', 'arrival', 'departure', 'adults', 'children',
  'activities', 'polaria_after_hours', 'day_by_day',
  'room_setup', 'champagne', 'airport_pickup', 'extra_nights', 'other_addons',
  'rate', 'total_nok', 'deposit_nok', 'stripe_session_id', 'receipt_url',
  'refund_nok', 'refund_reason',
  'concierge_brief', 'dietary_mobility', 'internal_notes', 'handled_by',
  'how_found', 'referrer_name', 'utm_source',
];

export function applyUpdate(existing, patch) {
  const out = { ...existing };
  for (const k of WRITABLE_FIELDS) {
    if (patch[k] !== undefined) out[k] = patch[k];
  }
  // Coerce numeric fields
  out.adults = Number(out.adults) || 0;
  out.children = Number(out.children) || 0;
  out.extra_nights = Number(out.extra_nights) || 0;
  out.total_nok = Number(out.total_nok) || 0;
  out.deposit_nok = Number(out.deposit_nok) || 0;
  out.refund_nok = Number(out.refund_nok) || 0;
  // Coerce booleans
  out.polaria_after_hours = !!out.polaria_after_hours;
  out.room_setup = !!out.room_setup;
  out.champagne = !!out.champagne;
  out.airport_pickup = !!out.airport_pickup;
  // Ensure activities is array of strings
  if (!Array.isArray(out.activities)) out.activities = [];
  out.activities = out.activities.filter((a) => typeof a === 'string').map(String);
  // Trim strings
  for (const k of WRITABLE_FIELDS) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  return out;
}
