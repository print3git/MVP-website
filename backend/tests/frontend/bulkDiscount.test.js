/** @jest-environment node */
/**
 * Calculate the bulk discount for the given items.
 * @param {Array<{qty?: number, material: string}>} items purchase items
 * @returns {number} discount in cents
 */
function computeBulkDiscount(items) {
  const TWO_PRINT_DISCOUNT = 700;
  const THIRD_PRINT_DISCOUNT = global.window.location.pathname.endsWith(
    "luckybox-payment.html",
  )
    ? 0
    : 1500;
  const MINI_SECOND_DISCOUNT = 500;

  let totalQty = 0;
  for (const it of items) {
    totalQty += Math.max(1, parseInt(it.qty || 1, 10));
  }
  if (global.window.location.pathname.endsWith("minis-checkout.html")) {
    if (totalQty >= 2) return MINI_SECOND_DISCOUNT;
    return 0;
  }

  let discount = 0;
  if (totalQty >= 2) discount += TWO_PRINT_DISCOUNT;
  if (totalQty >= 3) discount += THIRD_PRINT_DISCOUNT;
  return discount;
}

beforeEach(() => {
  global.window = { location: { pathname: "/" } };
});

test("bulk discount for 2 prints", () => {
  const items = [{ qty: 2, material: "single" }];
  expect(computeBulkDiscount(items)).toBe(700);
});

test("bulk discount for 3 prints", () => {
  const items = [{ qty: 3, material: "single" }];
  expect(computeBulkDiscount(items)).toBe(2200);
});

test("bulk discount capped after 3 prints", () => {
  const items = [{ qty: 5, material: "single" }];
  expect(computeBulkDiscount(items)).toBe(2200);
});
