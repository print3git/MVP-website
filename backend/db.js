// backend/db.js
require("dotenv").config();
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const { dbUrl } = require("./config");
const pool = new Pool({ connectionString: dbUrl });

function query(text, params) {
  return pool.query(text, params);
}

async function insertShare(jobId, userId, slug) {
  return query(
    "INSERT INTO shares(job_id, user_id, slug) VALUES($1,$2,$3) RETURNING *",
    [jobId, userId, slug],
  ).then((res) => res.rows[0]);
}

async function getShareBySlug(slug) {
  return query("SELECT * FROM shares WHERE slug=$1", [slug]).then(
    (res) => res.rows[0],
  );
}

async function getShareByJobId(jobId) {
  return query("SELECT * FROM shares WHERE job_id=$1", [jobId]).then(
    (res) => res.rows[0],
  );
}

async function insertCommission(
  orderId,
  modelId,
  sellerUserId,
  buyerUserId,
  commissionCents,
  status = "pending",
) {
  return query(
    "INSERT INTO model_commissions(order_id, model_id, seller_user_id, buyer_user_id, commission_cents, status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
    [orderId, modelId, sellerUserId, buyerUserId, commissionCents, status],
  ).then((res) => res.rows[0]);
}

async function getCommissionsForUser(userId) {
  return query(
    "SELECT * FROM model_commissions WHERE seller_user_id=$1 OR buyer_user_id=$1 ORDER BY created_at DESC",
    [userId],
  ).then((res) => res.rows);
}

function startOfWeek(d = new Date()) {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

async function upsertSubscription(
  userId,
  status,
  periodStart,
  periodEnd,
  customerId,
  subscriptionId,
) {
  return query(
    `INSERT INTO subscriptions(user_id, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id) DO UPDATE
     SET status=$2, current_period_start=$3, current_period_end=$4, stripe_customer_id=$5, stripe_subscription_id=$6, updated_at=NOW()
     RETURNING *`,
    [userId, status, periodStart, periodEnd, customerId, subscriptionId],
  ).then((res) => res.rows[0]);
}

async function cancelSubscription(userId) {
  return query(
    `UPDATE subscriptions SET status='canceled' WHERE user_id=$1 RETURNING *`,
    [userId],
  ).then((res) => res.rows[0]);
}

async function getSubscription(userId) {
  return query("SELECT * FROM subscriptions WHERE user_id=$1", [userId]).then(
    (res) => res.rows[0],
  );
}

async function ensureCurrentWeekCredits(userId, defaultCredits = 0) {
  const week = startOfWeek();
  const weekStr = week.toISOString().slice(0, 10);
  await query(
    `INSERT INTO subscription_credits(user_id, week_start, total_credits)
     VALUES($1,$2,$3)
     ON CONFLICT (user_id, week_start) DO NOTHING`,
    [userId, weekStr, defaultCredits],
  );
}

async function getCurrentWeekCredits(userId) {
  const week = startOfWeek();
  const weekStr = week.toISOString().slice(0, 10);
  return query(
    "SELECT total_credits, used_credits FROM subscription_credits WHERE user_id=$1 AND week_start=$2",
    [userId, weekStr],
  ).then((res) => res.rows[0]);
}

async function incrementCreditsUsed(userId, amount = 1) {
  const week = startOfWeek();
  const weekStr = week.toISOString().slice(0, 10);
  await ensureCurrentWeekCredits(userId, 0);
  return query(
    `UPDATE subscription_credits SET used_credits=used_credits + $3 WHERE user_id=$1 AND week_start=$2`,
    [userId, weekStr, amount],
  );
}

async function getOrCreateReferralLink(userId) {
  const { rows } = await query(
    "SELECT code FROM referral_links WHERE user_id=$1",
    [userId],
  );
  if (rows.length) return rows[0].code;
  const code = uuidv4().replace(/-/g, "").slice(0, 8);
  await query("INSERT INTO referral_links(user_id, code) VALUES($1,$2)", [
    userId,
    code,
  ]);
  return code;
}

async function getRewardPoints(userId) {
  const { rows } = await query(
    "SELECT points FROM reward_points WHERE user_id=$1",
    [userId],
  );
  return rows.length ? parseInt(rows[0].points, 10) : 0;
}

async function adjustRewardPoints(userId, delta) {
  const { rows } = await query(
    `INSERT INTO reward_points(user_id, points)
     VALUES($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET points = reward_points.points + EXCLUDED.points
     RETURNING points`,
    [userId, delta],
  );
  return parseInt(rows[0].points, 10);
}

async function getUserIdForReferral(code) {
  const { rows } = await query(
    "SELECT user_id FROM referral_links WHERE code=$1",
    [code],
  );
  return rows.length ? rows[0].user_id : null;
}

async function insertReferralEvent(referrerId, type) {
  await query("INSERT INTO referral_events(referrer_id, type) VALUES($1,$2)", [
    referrerId,
    type,
  ]);
}

async function getOrCreateOrderReferralLink(orderId) {
  const { rows } = await query(
    "SELECT code FROM order_referral_links WHERE order_id=$1",
    [orderId],
  );
  if (rows.length) return rows[0].code;
  const code = uuidv4().replace(/-/g, "").slice(0, 8);
  await query(
    "INSERT INTO order_referral_links(order_id, code) VALUES($1,$2)",
    [orderId, code],
  );
  return code;
}

async function insertReferredOrder(orderId, referrerId) {
  await query(
    "INSERT INTO referred_orders(order_id, referrer_id) VALUES($1,$2)",
    [orderId, referrerId],
  );
}
async function insertAdClick(subreddit, sessionId) {
  await query(
    "INSERT INTO ad_clicks(subreddit, session_id, timestamp) VALUES($1,$2,NOW())",
    [subreddit, sessionId],
  );
}

async function insertCartEvent(sessionId, modelId, subreddit) {
  await query(
    "INSERT INTO cart_events(session_id, model_id, subreddit, timestamp) VALUES($1,$2,$3,NOW())",
    [sessionId, modelId, subreddit],
  );
}

async function insertCheckoutEvent(sessionId, subreddit, step) {
  await query(
    "INSERT INTO checkout_events(session_id, subreddit, step, timestamp) VALUES($1,$2,$3,NOW())",
    [sessionId, subreddit, step],
  );
}

async function insertPageView(
  sessionId,
  subreddit,
  utmSource,
  utmMedium,
  utmCampaign,
) {
  await query(
    "INSERT INTO page_views(session_id, subreddit, utm_source, utm_medium, utm_campaign, timestamp) VALUES($1,$2,$3,$4,$5,NOW())",
    [sessionId, subreddit, utmSource, utmMedium, utmCampaign],
  );
}

async function insertSubscriptionEvent(userId, event, variant, priceCents) {
  await query(
    "INSERT INTO subscription_events(user_id, event, variant, price_cents) VALUES($1,$2,$3,$4)",
    [userId, event, variant, priceCents],
  );
}

async function getSubscriptionMetrics() {
  const active = await query(
    "SELECT COUNT(*) FROM subscriptions WHERE status='active'",
  );
  const churn = await query(
    "SELECT COUNT(*) FROM subscription_events WHERE event='cancel' AND created_at >= NOW() - INTERVAL '30 days'",
  );
  return {
    active: parseInt(active.rows[0].count, 10),
    churn_last_30_days: parseInt(churn.rows[0].count, 10),
  };
}

async function insertShareEvent(shareId, network) {
  await query(
    "INSERT INTO share_events(share_id, network, timestamp) VALUES($1,$2,NOW())",
    [shareId, network],
  );
}

async function getConversionMetrics() {
  const clicks = await query(
    "SELECT subreddit, COUNT(*) AS c FROM ad_clicks GROUP BY subreddit",
  );
  const carts = await query(
    "SELECT subreddit, COUNT(*) AS c FROM cart_events GROUP BY subreddit",
  );
  const completes = await query(
    "SELECT subreddit, COUNT(*) FILTER (WHERE step='complete') AS c FROM checkout_events GROUP BY subreddit",
  );
  const map = {};
  for (const row of clicks.rows)
    map[row.subreddit] = {
      clicks: parseInt(row.c, 10),
      carts: 0,
      completes: 0,
    };
  for (const row of carts.rows) {
    map[row.subreddit] = map[row.subreddit] || {
      clicks: 0,
      carts: 0,
      completes: 0,
    };
    map[row.subreddit].carts = parseInt(row.c, 10);
  }
  for (const row of completes.rows) {
    map[row.subreddit] = map[row.subreddit] || {
      clicks: 0,
      carts: 0,
      completes: 0,
    };
    map[row.subreddit].completes = parseInt(row.c, 10);
  }
  return Object.entries(map).map(([subreddit, d]) => ({
    subreddit,
    atcRate: d.clicks ? d.carts / d.clicks : 0,
    checkoutRate: d.clicks ? d.completes / d.clicks : 0,
  }));
}

async function getProfitMetrics() {
  const { rows } = await query(
    `SELECT o.subreddit,
            SUM(o.price_cents - o.discount_cents) AS revenue_cents,
            SUM(pc.cost_cents * o.quantity) AS cost_cents
       FROM orders o
       LEFT JOIN pricing_costs pc ON pc.product_type = o.product_type
      GROUP BY o.subreddit`,
  );
  return rows.map((r) => ({
    subreddit: r.subreddit,
    revenue: parseInt(r.revenue_cents, 10) || 0,
    cost: parseInt(r.cost_cents, 10) || 0,
    profit:
      (parseInt(r.revenue_cents, 10) || 0) - (parseInt(r.cost_cents, 10) || 0),
  }));
}

async function upsertMailingListEntry(email, token) {
  await query(
    `INSERT INTO mailing_list(email, token)
     VALUES($1,$2)
     ON CONFLICT (email) DO UPDATE SET token=$2, unsubscribed=FALSE`,
    [email, token],
  );
}

async function confirmMailingListEntry(token) {
  await query("UPDATE mailing_list SET confirmed=TRUE WHERE token=$1", [token]);
}

async function unsubscribeMailingListEntry(token) {
  await query("UPDATE mailing_list SET unsubscribed=TRUE WHERE token=$1", [
    token,
  ]);
}

async function insertSocialShare(userId, orderId, url) {
  const { rows } = await query(
    "INSERT INTO social_shares(user_id, order_id, post_url) VALUES($1,$2,$3) RETURNING id, verified",
    [userId, orderId, url],
  );
  return rows[0];
}

async function verifySocialShare(id, discountCode) {
  const { rows } = await query(
    "UPDATE social_shares SET verified=TRUE, discount_code=$2 WHERE id=$1 RETURNING user_id",
    [id, discountCode],
  );
  return rows[0];
}

async function getRewardOptions() {
  const { rows } = await query(
    "SELECT points, amount_cents FROM reward_options ORDER BY points",
  );
  return rows;
}

async function getRewardOption(points) {
  const { rows } = await query(
    "SELECT amount_cents FROM reward_options WHERE points=$1",
    [points],
  );
  return rows[0] || null;
}

async function insertAdSpend(subreddit, date, spendCents) {
  await query(
    `INSERT INTO ad_spend(subreddit, date, spend_cents)
     VALUES($1,$2,$3)
     ON CONFLICT (subreddit, date) DO UPDATE SET spend_cents=$3`,
    [subreddit, date, spendCents],
  );
}

async function getBusinessIntelligenceMetrics() {
  const profits = await getProfitMetrics();
  const spend = await query(
    "SELECT subreddit, SUM(spend_cents) AS spend_cents FROM ad_spend GROUP BY subreddit",
  );
  const orders = await query(
    "SELECT subreddit, COUNT(*) AS count FROM orders WHERE status='paid' GROUP BY subreddit",
  );
  const map = {};
  for (const p of profits) {
    map[p.subreddit] = {
      revenue: p.revenue,
      cost: p.cost,
      profit: p.profit,
      spend: 0,
      orders: 0,
    };
  }
  for (const row of spend.rows) {
    map[row.subreddit] = map[row.subreddit] || {
      revenue: 0,
      cost: 0,
      profit: 0,
      spend: 0,
      orders: 0,
    };
    map[row.subreddit].spend = parseInt(row.spend_cents, 10) || 0;
  }
  for (const row of orders.rows) {
    map[row.subreddit] = map[row.subreddit] || {
      revenue: 0,
      cost: 0,
      profit: 0,
      spend: 0,
      orders: 0,
    };
    map[row.subreddit].orders = parseInt(row.count, 10) || 0;
  }
  return Object.entries(map).map(([subreddit, d]) => ({
    subreddit,
    cac: d.orders ? d.spend / d.orders : 0,
    roas: d.spend ? d.revenue / d.spend : 0,
    profit: d.profit,
  }));
}

async function insertScalingEvent(subreddit, oldBudget, newBudget, reason) {
  await query(
    "INSERT INTO scaling_events(subreddit, old_budget_cents, new_budget_cents, reason) VALUES($1,$2,$3,$4)",
    [subreddit, oldBudget, newBudget, reason],
  );
}

async function getScalingEvents(limit = 50) {
  const { rows } = await query(
    "SELECT subreddit, old_budget_cents, new_budget_cents, reason, created_at FROM scaling_events ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
  return rows;
}

async function getUserCreations(userId, limit = 10, offset = 0) {
  const { rows } = await query(
    `SELECT c.id, c.title, c.category, j.job_id, j.model_url, j.snapshot
     FROM community_creations c
     JOIN jobs j ON c.job_id=j.job_id
     WHERE c.user_id=$1
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return rows;
}

async function insertCommunityComment(modelId, userId, text) {
  const { rows } = await query(
    "INSERT INTO community_comments(model_id, user_id, text) VALUES($1,$2,$3) RETURNING id, text, created_at",
    [modelId, userId, text],
  );
  return rows[0];
}

async function getCommunityComments(modelId, limit = 20) {
  const { rows } = await query(
    `SELECT cc.id, cc.text, cc.created_at, u.username
     FROM community_comments cc
     JOIN users u ON cc.user_id=u.id
     WHERE cc.model_id=$1
     ORDER BY cc.created_at ASC
     LIMIT $2`,
    [modelId, limit],
  );
  return rows;
}

async function listSpaces() {
  const { rows } = await query("SELECT * FROM spaces ORDER BY id");
  return rows;
}

async function createSpace(region, costCents, address) {
  const { rows } = await query(
    "INSERT INTO spaces(region, cost_cents, address) VALUES($1,$2,$3) RETURNING *",
    [region, costCents, address],
  );
  return rows[0];
}

async function createPrinterHub(name, location, operator) {
  const { rows } = await query(
    "INSERT INTO printer_hubs(name, location, operator) VALUES($1,$2,$3) RETURNING *",
    [name, location, operator],
  );
  return rows[0];
}

async function listPrinterHubs() {
  const { rows } = await query("SELECT * FROM printer_hubs ORDER BY id");

  return rows;
}

// async function createSpace(region, costCents, address) {
//   const { rows } = await query(
//     'INSERT INTO spaces(region, cost_cents, address) VALUES($1,$2,$3) RETURNING *',
//     [region, costCents, address]
//   );
//   return rows[0];
// }

async function listAllSpaces() {
  const { rows } = await query("SELECT * FROM spaces ORDER BY id");

  return rows;
}

async function addPrinter(serial, hubId) {
  const { rows } = await query(
    "INSERT INTO printers(serial, hub_id) VALUES($1,$2) RETURNING *",
    [serial, hubId],
  );

  return rows[0];
}

async function getPrintersByHub(hubId) {
  const { rows } = await query("SELECT * FROM printers WHERE hub_id=$1", [
    hubId,
  ]);
  return rows;
}

async function updatePrinterHub(id, location, operator) {
  const { rows } = await query(
    "UPDATE printer_hubs SET location=$2, operator=$3, updated_at=NOW() WHERE id=$1 RETURNING *",
    [id, location, operator],
  );
  return rows[0];
}

async function getHubShipments(hubId) {
  const { rows } = await query(
    "SELECT * FROM hub_shipments WHERE hub_id=$1 ORDER BY shipped_at DESC",
    [hubId],
  );
  return rows;
}

async function insertPrinterMetric(
  printerId,
  status,
  queueLength,
  error,
  utilization = null,
  idleSeconds = null,
  avgCompletionSeconds = null,
) {
  await query(
    "INSERT INTO printer_metrics(printer_id, status, queue_length, error, utilization, idle_seconds, avg_completion_seconds) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      printerId,
      status,
      queueLength,
      error,
      utilization,
      idleSeconds,
      avgCompletionSeconds,
    ],
  );
}

async function getLatestPrinterMetrics() {
  const { rows } = await query(
    `SELECT DISTINCT ON (printer_id) printer_id, status, queue_length, error, utilization, idle_seconds, avg_completion_seconds, created_at
     FROM printer_metrics
     ORDER BY printer_id, created_at DESC`,
  );
  return rows;
}

async function getAverageJobCompletionSeconds() {
  const { rows } = await query(
    "SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) AS avg FROM jobs WHERE status='sent'",
  );
  return rows[0] && rows[0].avg ? parseFloat(rows[0].avg) : null;
}

async function insertHubShipment(hubId, carrier, trackingNumber, status) {
  const { rows } = await query(
    "INSERT INTO hub_shipments(hub_id, carrier, tracking_number, status) VALUES($1,$2,$3,$4) RETURNING *",
    [hubId, carrier, trackingNumber, status],
  );
  return rows[0];
}

// async function createSpace(region, costCents, address) {
//   const { rows } = await query(
//     'INSERT INTO spaces(region, cost_cents, address) VALUES($1,$2,$3) RETURNING *',
//     [region, costCents, address]
//   );
//   return rows[0];
// }
//
// async function listSpaces() {
//   const { rows } = await query('SELECT * FROM spaces ORDER BY id');
//   return rows;
// }

async function upsertOrderLocationSummary(date, state, count, hours) {
  const { rows } = await query(
    `INSERT INTO order_location_summary(summary_date, state, order_count, estimated_hours)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (summary_date, state)
     DO UPDATE SET order_count=$3, estimated_hours=$4, updated_at=NOW()
     RETURNING *`,
    [date, state, count, hours],
  );
  return rows[0];
}

async function getOrderLocationSummary(date) {
  const { rows } = await query(
    "SELECT state, order_count, estimated_hours FROM order_location_summary WHERE summary_date=$1 ORDER BY state",
    [date],
  );
  return rows;
}

async function adjustInventory(hubId, material, delta) {
  await query(
    "INSERT INTO hub_inventory(hub_id, material, quantity) VALUES($1,$2,0) ON CONFLICT (hub_id, material) DO NOTHING",
    [hubId, material],
  );
  await query(
    "UPDATE hub_inventory SET quantity = quantity + $1 WHERE hub_id=$2 AND material=$3",
    [delta, hubId, material],
  );
}

async function getLowInventory() {
  const { rows } = await query(
    `SELECT h.name, i.material, i.quantity, i.threshold
       FROM hub_inventory i
       JOIN printer_hubs h ON i.hub_id=h.id
      WHERE i.quantity < i.threshold`,
  );
  return rows;
}

async function upsertHubSaturationSummary(date, hubId, saturation) {
  const { rows } = await query(
    `INSERT INTO hub_saturation_summary(summary_date, hub_id, avg_queue_saturation)
     VALUES($1,$2,$3)
     ON CONFLICT (summary_date, hub_id)
     DO UPDATE SET avg_queue_saturation=$3, updated_at=NOW()
     RETURNING *`,
    [date, hubId, saturation],
  );
  return rows[0];
}

async function getHubSaturationSummary(date) {
  const { rows } = await query(
    "SELECT hub_id, avg_queue_saturation FROM hub_saturation_summary WHERE summary_date=$1 ORDER BY hub_id",
    [date],
  );
  return rows;
}
//
// async function listSpaces() {
//   const { rows } = await query('SELECT * FROM spaces ORDER BY id');
//   return rows;
// }
//
// async function createSpace(region, costCents, address) {
//   const { rows } = await query(
//     'INSERT INTO spaces(region, cost_cents, address) VALUES($1,$2,$3) RETURNING *',
//     [region, costCents, address]
//   );
//   return rows[0];
// }

module.exports = {
  query,
  insertShare,
  getShareBySlug,
  getShareByJobId,
  insertCommission,
  getCommissionsForUser,
  upsertSubscription,
  insertAdClick,
  insertCartEvent,
  insertCheckoutEvent,
  insertSubscriptionEvent,
  getSubscriptionMetrics,
  getConversionMetrics,
  cancelSubscription,
  getSubscription,
  ensureCurrentWeekCredits,
  getCurrentWeekCredits,
  incrementCreditsUsed,
  getOrCreateReferralLink,
  getRewardPoints,
  adjustRewardPoints,
  getUserIdForReferral,
  insertReferralEvent,
  getOrCreateOrderReferralLink,
  insertReferredOrder,
  insertShareEvent,
  insertPageView,
  getProfitMetrics,
  upsertMailingListEntry,
  confirmMailingListEntry,
  unsubscribeMailingListEntry,
  insertSocialShare,
  verifySocialShare,
  getUserCreations,
  insertCommunityComment,
  getCommunityComments,
  listSpaces,
  createSpace,
  getRewardOptions,
  getRewardOption,
  insertScalingEvent,
  getScalingEvents,
  // createSpace,
  // listSpaces,
  listAllSpaces,
  createPrinterHub,
  listPrinterHubs,
  addPrinter,
  getPrintersByHub,
  updatePrinterHub,
  getHubShipments,
  insertPrinterMetric,
  getLatestPrinterMetrics,
  insertHubShipment,
  upsertOrderLocationSummary,
  getOrderLocationSummary,

  // listSpaces,
  // createSpace,

  upsertHubSaturationSummary,
  getHubSaturationSummary,

  // newly exposed helpers
  insertAdSpend,
  getAverageJobCompletionSeconds,
  getBusinessIntelligenceMetrics,
  adjustInventory,
  getLowInventory,
};
