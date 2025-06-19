"use strict";

const REGION_RATES = {
  UK: 0.2,
  FR: 0.2,
  DE: 0.19,
  AU: 0.1,
  NZ: 0.15,
  SG: 0.08,
  CA: 0.05,
  IN: 0.18,
};

function computeTaxOwed(amount, region) {
  if (typeof amount !== "number" || amount < 0) return 0;
  const rate = REGION_RATES[region] || 0;
  return Math.round(amount * rate * 100) / 100;
}

module.exports = { computeTaxOwed, REGION_RATES };
