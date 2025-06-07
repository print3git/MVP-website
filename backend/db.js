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

async function addCartItem(userId, jobId, quantity = 1) {
  return query(
    'INSERT INTO cart_items(user_id, job_id, quantity) VALUES($1,$2,$3) RETURNING *',
    [userId, jobId, quantity]
  ).then((res) => res.rows[0]);
}

async function updateCartItem(id, quantity) {
  return query('UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING *', [quantity, id]).then(
    (res) => res.rows[0]
  );
}

async function removeCartItem(id) {
  return query('DELETE FROM cart_items WHERE id=$1', [id]);
}

async function getCartItems(userId) {
  return query('SELECT * FROM cart_items WHERE user_id=$1 ORDER BY id', [userId]).then(
    (res) => res.rows
  );
}

async function clearCart(userId) {
  return query('DELETE FROM cart_items WHERE user_id=$1', [userId]);
}

async function insertOrderItem(orderId, jobId, quantity = 1) {
  return query(
    'INSERT INTO order_items(order_id, job_id, quantity) VALUES($1,$2,$3) RETURNING *',
    [orderId, jobId, quantity]
  ).then((res) => res.rows[0]);
}

async function getOrderItems(orderId) {
  return query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [orderId]).then(
    (res) => res.rows
  );
}

module.exports = {
  query,
  insertShare,
  getShareBySlug,
  getShareByJobId,
  addCartItem,
  updateCartItem,
  removeCartItem,
  getCartItems,
  clearCart,
  insertOrderItem,
  getOrderItems,
};
