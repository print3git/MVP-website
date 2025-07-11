const axios = require("axios");
const Stripe = require("stripe");
const { startServer } = require("../tests/util");
const { orders } = require("../backend/src/routes/checkout");

(async () => {
  const port = 4001;
  process.env.STRIPE_WEBHOOK_SECRET =
    process.env.STRIPE_WEBHOOK_SECRET || "whsec_test";
  const stripe = new Stripe("sk_test_dummy");
  const { url, close } = await startServer(port);
  const sessionId = `sess_${Date.now()}`;
  orders.set(sessionId, {
    slug: "test-model",
    email: "user@example.com",
    paid: false,
  });

  const event = {
    id: "evt_test_webhook",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: sessionId } },
  };
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  try {
    const res = await axios.post(`${url}/api/stripe/webhook`, payload, {
      headers: {
        "Stripe-Signature": signature,
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    if (!orders.get(sessionId)?.paid) throw new Error("order not marked paid");
    console.log("✅ webhook test passed");
  } catch (err) {
    console.error("❌ webhook test failed:", err.message);
    process.exit(1);
  } finally {
    await close();
  }
})();
