// backend/db.js
require('dotenv').config();
const { Pool } = require('pg');
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

async function getCommissionsForSeller(userId) {
  return query('SELECT * FROM model_commissions WHERE seller_user_id=$1 ORDER BY created_at DESC', [
    userId,
  ]).then((res) => res.rows);
}

async function markCommissionPaid(id) {
  return query('UPDATE model_commissions SET status=$1 WHERE id=$2 RETURNING *', ['paid', id]).then(
    (res) => res.rows[0]
  );
}

module.exports = {
  query,
  insertShare,
  getShareBySlug,
  getShareByJobId,
  insertCommission,
  getCommissionsForUser,
  getCommissionsForSeller,
  markCommissionPaid,
};
