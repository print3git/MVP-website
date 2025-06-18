// backend/db.js
require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { dbUrl } = require('./config');
const pool = new Pool({ connectionString: dbUrl });

function query(text, params) {
  return pool.query(text, params);
}

async function insertShare(jobId, userId, slug) {
  return query('INSERT INTO shares(job_id, user_id, slug) VALUES($1,$2,$3) RETURNING *', [
    jobId,
    userId,
    slug,
  ]).then((res) => res.rows[0]);
}

async function getShareBySlug(slug) {
  return query('SELECT * FROM shares WHERE slug=$1', [slug]).then((res) => res.rows[0]);
}

async function getShareByJobId(jobId) {
  return query('SELECT * FROM shares WHERE job_id=$1', [jobId]).then((res) => res.rows[0]);
}

async function insertCommission(
  orderId,
  modelId,
  sellerUserId,
  buyerUserId,
  commissionCents,
  status = 'pending'
) {
  return query(
    'INSERT INTO model_commissions(order_id, model_id, seller_user_id, buyer_user_id, commission_cents, status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [orderId, modelId, sellerUserId, buyerUserId, commissionCents, status]
  ).then((res) => res.rows[0]);
}

async function getCommissionsForUser(userId) {
  return query(
    'SELECT * FROM model_commissions WHERE seller_user_id=$1 OR buyer_user_id=$1 ORDER BY created_at DESC',
    [userId]
  ).then((res) => res.rows);
}

function startOfWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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
  subscriptionId
) {
  return query(
    `INSERT INTO subscriptions(user_id, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id) DO UPDATE
     SET status=$2, current_period_start=$3, current_period_end=$4, stripe_customer_id=$5, stripe_subscription_id=$6, updated_at=NOW()
     RETURNING *`,
    [userId, status, periodStart, periodEnd, customerId, subscriptionId]
  ).then((res) => res.rows[0]);
}

async function cancelSubscription(userId) {
  return query(`UPDATE subscriptions SET status='canceled' WHERE user_id=$1 RETURNING *`, [
    userId,
  ]).then((res) => res.rows[0]);
}

async function getSubscription(userId) {
  return query('SELECT * FROM subscriptions WHERE user_id=$1', [userId]).then((res) => res.rows[0]);
}

async function ensureCurrentWeekCredits(userId, defaultCredits = 0) {
  const week = startOfWeek();
  const weekStr = week.toISOString().slice(0, 10);
  await query(
    `INSERT INTO subscription_credits(user_id, week_start, total_credits)
     VALUES($1,$2,$3)
     ON CONFLICT (user_id, week_start) DO NOTHING`,
    [userId, weekStr, defaultCredits]
  );
}

async function getCurrentWeekCredits(userId) {
  const week = startOfWeek();
  const weekStr = week.toISOString().slice(0, 10);
  return query(
    'SELECT total_credits, used_credits FROM subscription_credits WHERE user_id=$1 AND week_start=$2',
    [userId, weekStr]
  ).then((res) => res.rows[0]);
}

async function incrementCreditsUsed(userId, amount = 1) {
  const week = startOfWeek();
  const weekStr = week.toISOString().slice(0, 10);
  await ensureCurrentWeekCredits(userId, 0);
  return query(
    `UPDATE subscription_credits SET used_credits=used_credits + $3 WHERE user_id=$1 AND week_start=$2`,
    [userId, weekStr, amount]
  );
}

async function getOrCreateReferralLink(userId) {
  const { rows } = await query('SELECT code FROM referral_links WHERE user_id=$1', [userId]);
  if (rows.length) return rows[0].code;
  const code = uuidv4().replace(/-/g, '').slice(0, 8);
  await query('INSERT INTO referral_links(user_id, code) VALUES($1,$2)', [userId, code]);
  return code;
}

async function getRewardPoints(userId) {
  const { rows } = await query('SELECT points FROM reward_points WHERE user_id=$1', [userId]);
  return rows.length ? parseInt(rows[0].points, 10) : 0;
}

async function adjustRewardPoints(userId, delta) {
  const { rows } = await query(
    `INSERT INTO reward_points(user_id, points)
     VALUES($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET points = reward_points.points + EXCLUDED.points
     RETURNING points`,
    [userId, delta]
  );
  return parseInt(rows[0].points, 10);
}

async function getUserIdForReferral(code) {
  const { rows } = await query('SELECT user_id FROM referral_links WHERE code=$1', [code]);
  return rows.length ? rows[0].user_id : null;
}

async function insertReferralEvent(referrerId, type) {
  await query('INSERT INTO referral_events(referrer_id, type) VALUES($1,$2)', [referrerId, type]);
}

async function insertAdClick(subreddit, sessionId) {
  await query('INSERT INTO ad_clicks(subreddit, session_id) VALUES($1,$2)', [subreddit, sessionId]);
}

async function insertCartEvent(sessionId, modelId, subreddit) {
  await query('INSERT INTO cart_events(session_id, model_id, subreddit) VALUES($1,$2,$3)', [
    sessionId,
    modelId,
    subreddit,
  ]);
}

async function insertCheckoutEvent(sessionId, subreddit, step) {
  await query('INSERT INTO checkout_events(session_id, subreddit, step) VALUES($1,$2,$3)', [
    sessionId,
    subreddit,
    step,
  ]);
}

async function getConversionMetrics() {
  const { rows } = await query(`
    SELECT
      sr AS subreddit,
      COALESCE(ad_clicks,0) AS ad_clicks,
      COALESCE(cart_events,0) AS cart_events,
      COALESCE(checkout_start,0) AS checkout_start,
      COALESCE(checkout_complete,0) AS checkout_complete
    FROM (
      SELECT DISTINCT subreddit AS sr FROM ad_clicks
      UNION SELECT DISTINCT subreddit FROM cart_events
      UNION SELECT DISTINCT subreddit FROM checkout_events
    ) AS s
    LEFT JOIN (
      SELECT subreddit, COUNT(*) AS ad_clicks FROM ad_clicks GROUP BY subreddit
    ) ac ON ac.subreddit = s.sr
    LEFT JOIN (
      SELECT subreddit, COUNT(*) AS cart_events FROM cart_events GROUP BY subreddit
    ) ce ON ce.subreddit = s.sr
    LEFT JOIN (
      SELECT subreddit, COUNT(*) FILTER (WHERE step='start') AS checkout_start,
             COUNT(*) FILTER (WHERE step='complete') AS checkout_complete
      FROM checkout_events GROUP BY subreddit
    ) ch ON ch.subreddit = s.sr
  `);

  return rows.map((r) => ({
    subreddit: r.subreddit,
    ctr: r.ad_clicks ? r.cart_events / r.ad_clicks : 0,
    atc: r.cart_events ? r.checkout_start / r.cart_events : 0,
    checkout: r.checkout_start ? r.checkout_complete / r.checkout_start : 0,
  }));
}

module.exports = {
  query,
  insertShare,
  getShareBySlug,
  getShareByJobId,
  insertCommission,
  getCommissionsForUser,
  upsertSubscription,
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
  insertAdClick,
  insertCartEvent,
  insertCheckoutEvent,
  getConversionMetrics,
};
