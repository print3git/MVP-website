// api/create-payment-intent.js
import Stripe from 'stripe';

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'sk_test_51H8KxS**********************',
  { apiVersion: '2023-10-16' }
);

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2999,            // £29.99 -- hard-coded demo price
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
