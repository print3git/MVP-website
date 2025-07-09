import express from 'express';
import Stripe from 'stripe';
import { PRODUCT } from '../pricing';
import { sendMail } from '../../mail';

export interface Order {
  slug: string;
  email: string;
  paid?: boolean;
}

export const orders = new Map<string, Order>();

const secretKey = process.env.NODE_ENV === 'production'
  ? process.env.STRIPE_LIVE_KEY
  : process.env.STRIPE_TEST_KEY;
if (!secretKey) {
  throw new Error('Stripe key not configured');
}
const stripe = new Stripe(secretKey);

const router = express.Router();

router.post('/api/checkout', async (req, res) => {
  const { slug, email } = req.body as Order;
  if (!slug || !email) return res.status(400).json({ error: 'missing fields' });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: PRODUCT.currency,
            product_data: { name: PRODUCT.name },
            unit_amount: PRODUCT.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: { slug, email },
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
    });
    orders.set(session.id, { slug, email, paid: false });
    res.json({ checkoutUrl: session.url });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (_err) {
    return res.status(400).send('Webhook Error');
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const order = orders.get(session.id);
    if (order && !order.paid) {
      order.paid = true;
      const link = `https://huggingface.co/spaces/print2/Sparc3D/resolve/main/output/${order.slug}.glb`;
      await sendMail(order.email, 'Your model is ready', link);
    }
  }
  res.json({ received: true });
});

export default router;
