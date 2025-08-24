import Stripe from "stripe";

export function sign(payloadJson: string, secret: string): { header: string } {
  const header = Stripe.webhooks.generateTestHeaderString({
    payload: payloadJson,
    secret,
    timestamp: Math.floor(Date.now() / 1000),
  });
  return { header };
}
