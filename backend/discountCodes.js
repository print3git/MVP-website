const db = require('./db');

async function getValidDiscountCode(code) {
  if (!code) return null;
  const key = String(code).trim().toUpperCase();
  const { rows } = await db.query('SELECT * FROM discount_codes WHERE code=$1', [key]);
  const row = rows[0];
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  if (row.max_uses !== null && row.uses >= row.max_uses) return null;
  return row;
}

async function validateDiscountCode(code) {
  const row = await getValidDiscountCode(code);
  return row ? row.amount_cents : null;
}

async function incrementDiscountUsage(id) {
  if (!id) return;
  await db.query('UPDATE discount_codes SET uses = uses + 1 WHERE id=$1', [id]);
}

module.exports = {
  validateDiscountCode,
  getValidDiscountCode,
  incrementDiscountUsage,
};
