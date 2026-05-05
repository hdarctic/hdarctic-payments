# HD Arctic Payments

Stripe Checkout backend for hdarctic.com.

This repo contains three Vercel serverless functions that power the booking → payment → confirmation flow on the HD Arctic site:

- `api/create-checkout-session` — called from the widget when a customer clicks **Pay**. Creates a Stripe Checkout Session and returns the hosted URL.
- `api/get-booking` — called from the `/booking-confirmed` page. Looks up a Checkout Session and returns booking details to display.
- `api/stripe-webhook` — receives Stripe webhook events for completed payments, expired sessions, and refunds.

## Environment variables (set in Vercel dashboard)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` while building, `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe Dashboard → Webhooks |
| `BREVO_API_KEY` | Set when transactional emails are wired up (later) |
