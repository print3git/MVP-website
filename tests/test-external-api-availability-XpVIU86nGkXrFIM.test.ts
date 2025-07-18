import fetch from "node-fetch";

describe("external API availability", () => {
  const stripeKey =
    process.env.STRIPE_TEST_KEY || process.env.STRIPE_SECRET_KEY;
  const hfKey = process.env.HF_API_KEY;

  test("Stripe customers endpoint returns 200", async () => {
    if (!stripeKey) {
      console.warn("Skipping Stripe API check: STRIPE_TEST_KEY missing");
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const start = Date.now();
    const res = await fetch("https://api.stripe.com/v1/customers", {
      headers: { Authorization: `Bearer ${stripeKey}` },
      signal: controller.signal,
    });
    const latency = Date.now() - start;
    console.log(`Stripe latency: ${latency}ms`);
    clearTimeout(timeout);
    if (res.status === 401) {
      throw new Error("Stripe auth failed (401)");
    }
    expect(res.status).toBe(200);
  });

  test("HuggingFace model list reachable", async () => {
    if (!hfKey) {
      console.warn("Skipping HuggingFace API check: HF_API_KEY missing");
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const start = Date.now();
    const res = await fetch("https://huggingface.co/api/models?limit=1", {
      headers: { Authorization: `Bearer ${hfKey}` },
      signal: controller.signal,
    });
    const latency = Date.now() - start;
    console.log(`HuggingFace latency: ${latency}ms`);
    clearTimeout(timeout);
    if (res.status === 401) {
      throw new Error("HuggingFace auth failed (401)");
    }
    expect(res.status).toBe(200);
    await res.json();
  });
});
