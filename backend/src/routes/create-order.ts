import { Router } from "express";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Stripe = require("stripe");
import jwt from "jsonwebtoken";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prohibited = require("../../prohibited_countries.json");

const router = Router();

router.post("/create-order", async (req, res) => {
  try {
    const {
      jobId,
      price,
      qty = 1,
      discount = 0,
      productType,
      shippingInfo,
      etchName,
      utmSource,
      utmMedium,
      utmCampaign,
      adSubreddit,
    } = req.body || {};
    if (!jobId) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const jobRes = await db.query(
      "SELECT job_id, user_id FROM jobs WHERE job_id=$1",
      [jobId],
    );
    const job = jobRes.rows[0];
    if (!job) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (!price || !productType) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    if (shippingInfo?.country && prohibited.includes(shippingInfo.country)) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const quantity = qty || 1;
    let discountCents = 0;
    if (quantity > 1) {
      discountCents += Math.round(price * quantity * 0.05);
    }
    if (discount) discountCents += discount;

    let userId = job.user_id;
    try {
      const auth = req.headers.authorization?.split(" ")[1];
      if (auth) {
        const payload = jwt.verify(
          auth,
          process.env.AUTH_SECRET || "secret",
        ) as any;
        if (payload?.id) {
          userId = payload.id;
          const { rows } = await db.query(
            "SELECT COUNT(*) FROM orders WHERE user_id=$1",
            [userId],
          );
          if (rows[0]?.count === "0") {
            discountCents += 10;
          }
        }
      }
    } catch {
      // ignore auth errors
    }

    const finalTotal = price * quantity - discountCents;
    const stripeSecret = process.env.STRIPE_SECRET_KEY || "test";
    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2022-11-15",
    });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: finalTotal,
          },
          quantity: 1,
        },
      ],
      success_url: "https://stripe.test",
      cancel_url: "https://stripe.test/cancel",
    });

    await db.query(
      "INSERT INTO orders(job_id, session_id, user_id, total_cents, price_cents, qty, product_type, discount_cents, etch_name, referral, utm_source, utm_medium, utm_campaign, ad_subreddit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
      [
        jobId,
        session.id,
        userId,
        finalTotal,
        price,
        quantity,
        productType,
        discountCents,
        etchName || null,
        null,
        utmSource || null,
        utmMedium || null,
        utmCampaign || null,
        adSubreddit || null,
      ],
    );

    res.json({ checkoutUrl: session.url, success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/my/orders", async (req, res) => {
  try {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    let userId: string;
    try {
      const payload = jwt.verify(
        auth,
        process.env.AUTH_SECRET || "secret",
      ) as any;
      userId = payload.id;
    } catch {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const { rows } = await db.query(
      "SELECT session_id, snapshot, prompt FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
      [userId],
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
