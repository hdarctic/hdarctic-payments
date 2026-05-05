const Stripe = require('stripe');

module.exports.config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed');
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    console.error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.');
    return res.status(500).end('Server misconfigured');
  }

  const stripe = Stripe(stripeKey);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const m = session.metadata || {};
        console.log('[checkout.session.completed]', {
          id: session.id,
          email: session.customer_details && session.customer_details.email,
          amount: session.amount_total / 100,
          package: m.package_name,
          rate: m.rate_type,
          dates: `${m.arrival_date} → ${m.departure_date}`,
        });
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        console.log('[checkout.session.expired]', { id: session.id });
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        console.log('[charge.refunded]', {
          id: charge.id,
          amount: charge.amount_refunded / 100,
        });
        break;
      }
      default:
        console.log('[unhandled event]', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
};
