import { Router } from "express";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import * as db from "../../db";
import logger from "../logger.js";
import { capture } from "../lib/logger";
import prohibited from "../../prohibited_countries.json" assert { type: "json" };
const router = Router();

function getUserId(req: any): string | null {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.AUTH_SECRET || "secret");
    return decoded.id || null;
  } catch {
    return null;
  }
}

router.post("/create-order", async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2022-11-15",
    });
    const {
      jobId,
      price,
      qty = 1,
      discount = 0,
      productType,
      referral,
      shippingInfo,
      etchName,
      useCredit,
      utmSource,
      utmMedium,
      utmCampaign,
      adSubreddit,
    } = req.body || {};

    if (!jobId || (!price && !useCredit) || !productType) {
      return res.status(400).json({ error: "bad_request" });
    }

    const jobRes = await db.query(
      "SELECT job_id, user_id FROM jobs WHERE job_id=$1",
      [jobId],
    );
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: "job_not_found" });
    }
    const job = jobRes.rows[0];
    const buyerId = getUserId(req);

    if (shippingInfo?.country && prohibited.includes(shippingInfo.country)) {
      return res.status(400).json({ error: "prohibited_destination" });
    }

    if (useCredit) {
      if (!buyerId) return res.status(401).json({ error: "unauthorized" });
      const sub = await db.getSubscription(buyerId);
      if (!sub || sub.status !== "active") {
        return res.status(400).json({ error: "no_subscription" });
      }
      if (qty % 2 !== 0) {
        return res.status(400).json({ error: "invalid_quantity" });
      }
      const needed = qty / 2;
      const credits = await db.getCurrentWeekCredits(buyerId);
      if (credits.used_credits + needed > credits.total_credits) {
        return res.status(400).json({ error: "insufficient_credits" });
      }
      await db.incrementCreditsUsed(buyerId, needed);
      await db.query(
        "INSERT INTO orders(job_id, session_id, user_id, price_cents, qty, product_type, referral_code, discount_cents, etch_name, shipping_info, utm_source, utm_medium, utm_campaign, ad_subreddit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
        [
          jobId,
          null,
          buyerId,
          0,
          qty,
          productType,
          referral || null,
          0,
          etchName || null,
          shippingInfo || null,
          utmSource || null,
          utmMedium || null,
          utmCampaign || null,
          adSubreddit || null,
        ],
      );
      return res.json({ success: true });
    }

    let total = price * qty;
    let discountTotal = 0;
    if (qty >= 2) {
      discountTotal += Math.round(total * 0.05);
    }
    if (discount) {
      discountTotal += discount;
    }
    let firstOrder = false;
    if (buyerId) {
      const countRes = await db.query(
        "SELECT COUNT(*) FROM orders WHERE user_id=$1",
        [buyerId],
      );
      if (countRes.rows?.[0]?.count === "0") {
        const first = Math.round(total * 0.1);
        discountTotal += first;
        firstOrder = true;
      }
    }
    let referrerId: string | null = null;
    if (referral) {
      referrerId = await db.getUserIdForReferral(referral);
      await db.insertReferredOrder?.(jobId, referrerId);
      const count = await db.query(
        "SELECT COUNT(*) FROM orders WHERE referred_by=$1",
        [referrerId],
      );
      if (count.rows?.[0]?.count >= "3") {
        discountTotal = total;
        await db.query("INSERT INTO incentives(user_id, code) VALUES ($1,$2)", [
          referrerId,
          `three_orders_${Date.now()}`,
        ]);
      }
    }

    const finalPrice = Math.max(total - discountTotal, 0);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: productType },
            unit_amount: finalPrice,
          },
          quantity: 1,
        },
      ],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
    });

    await db.query(
      "INSERT INTO orders(job_id, session_id, user_id, price_cents, qty, product_type, referral_code, discount_cents, etch_name, shipping_info, utm_source, utm_medium, utm_campaign, ad_subreddit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
      [
        jobId,
        session.id,
        buyerId || null,
        finalPrice,
        qty,
        productType,
        referral || null,
        discountTotal,
        etchName || null,
        shippingInfo || null,
        utmSource || null,
        utmMedium || null,
        utmCampaign || null,
        adSubreddit || null,
      ],
    );

    if (buyerId && job.user_id && buyerId !== job.user_id) {
      db.insertCommission?.(session.id, jobId, job.user_id, buyerId, 10);
    }

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    logger.error("create_order_failed", err as Error);
    capture(err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

router.get("/my/orders", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  try {
    const result = await db.query(
      "SELECT session_id, snapshot, prompt FROM orders WHERE user_id=$1",
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    logger.error("list_orders_failed", err as Error);
    capture(err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

export default router;
