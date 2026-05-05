const Stripe = require('stripe');

function buildConfirmationNumber(session) {
  const created = session.created
    ? new Date(session.created * 1000)
    : new Date();
  const year = created.getUTCFullYear();
  const tail = (session.id || '').slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `HDA-${year}-${tail}`;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY is not set.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const sessionId = (req.query && req.query.session_id) || '';
  if (!sessionId || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid or missing session_id.' });
  }

  const stripe = Stripe(stripeKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const m = session.metadata || {};

    return res.status(200).json({
      confirmation_number: buildConfirmationNumber(session),
      payment_status: session.payment_status,
      amount_total: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency,
      customer_email: session.customer_details && session.customer_details.email,
      customer_name: m.customer_name || (session.customer_details && session.customer_details.name) || '',
      package_id: m.package_id || '',
      package_name: m.package_name || '',
      package_type: m.package_type || '',
      rate_type: m.rate_type || '',
      arrival_date: m.arrival_date || '',
      departure_date: m.departure_date || '',
      adults: m.adults ? Number(m.adults) : null,
      children: m.children ? Number(m.children) : 0,
      special_requests: m.special_requests || '',
      booked_at: session.created ? new Date(session.created * 1000).toISOString() : null,
    });
  } catch (err) {
    console.error('Failed to retrieve session:', err);
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    return res.status(500).json({ error: 'Failed to retrieve booking.' });
  }
};
