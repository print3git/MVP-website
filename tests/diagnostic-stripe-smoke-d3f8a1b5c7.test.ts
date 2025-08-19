import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY || '';
if (!key) {
  console.log('Skipping Stripe smoke test: STRIPE_SECRET_KEY missing');
}
const run = key ? test : test.skip;

describe('diagnostic stripe smoke', () => {
  run('lists customers with real credentials', async () => {
    if (/dummy|your|sk_test_\.{3}/i.test(key)) {
      throw new Error('STRIPE_SECRET_KEY missing or placeholder');
    }
    const stripe = new Stripe(key, { apiVersion: '2025-06-30.basil' });
    try {
      const res = await stripe.customers.list({ limit: 1 });
      if (!Array.isArray(res.data)) {
        throw new Error('Stripe returned unexpected response');
      }
    } catch (err: any) {
      throw new Error(`Stripe API call failed: ${err.message}`);
    }
  });
});
