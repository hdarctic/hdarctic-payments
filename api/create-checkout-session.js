/**
 * /api/create-checkout-session
 *
 * Creates a Stripe Checkout Session for a HD Arctic package booking.
 */

const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY is not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const stripe = Stripe(stripeKey);

  try {
    const {
      package_id,
      package_name,
      package_type,
      rate_type,
      amount_nok,
      currency = 'nok',
      arrival_date,
      departure_date,
      adults,
      children = 0,
      customer_name,
      customer_email,
      customer_phone,
      special_requests = '',
    } = req.body || {};

    const required = {
      package_id, package_name, package_type, rate_type,
      amount_nok, arrival_date, departure_date, adults,
      customer_name, customer_email,
    };
    for (const [key, value] of Object.entries(required)) {
      if (value === undefined || value === null || value === '') {
        return res.status(400).json({ error: `Missing required field: ${key}` });
      }
    }

    if (typeof amount_nok !== 'number' || amount_nok < 100 || amount_nok > 500000) {
      return res.status(400).json({ error: 'Invalid amount_nok (must be 100–500000).' });
    }

    if (rate_type !== 'flex' && rate_type !== 'non_refundable') {
      return res.status(400).json({ error: 'rate_type must be "flex" or "non_refundable".' });
    }

    const amountInOre = Math.round(amount_nok * 100);

    const partyText = children > 0
      ? `${adults} adults, ${children} children`
      : `${adults} ${adults === 1 ? 'adult' : 'adults'}`;
    const dateText = `${arrival_date} → ${departure_date}`;
    const rateLabel = rate_type === 'flex' ? 'Flex' : 'Pre-paid Non-Refundable';
    const description = `${package_type} · ${rateLabel} · ${dateText} · ${partyText}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email,
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: amountInOre,
            product_data: {
              name: `${package_name} — ${package_type}`,
              description,
              metadata: { package_id, package_type, rate_type },
            },
          },
        },
      ],
      success_url: 'https://hdarctic.com/booking-confirmed?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://hdarctic.com/packages?cancelled=1',
      metadata: {
        package_id,
        package_name,
        package_type,
        rate_type,
        arrival_date,
        departure_date,
        adults: String(adults),
        children: String(children),
        customer_name,
        customer_phone: customer_phone || '',
        special_requests: special_requests.slice(0, 450),
      },
      locale: 'auto',
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
    });

    return res.status(200).json({
      url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    console.error('Stripe Checkout Session creation failed:', err);
    return res.status(500).json({
      error: 'Failed to create checkout session.',
      detail: err.message,
    });
  }
};
