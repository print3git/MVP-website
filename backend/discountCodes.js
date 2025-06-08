const DISCOUNT_CODES = {
  SAVE5: 500,
  SAVE10: 1000,
};

function validateDiscountCode(code) {
  if (!code) return null;
  const key = String(code).trim().toUpperCase();
  return DISCOUNT_CODES[key] || null;
}

module.exports = { validateDiscountCode };
