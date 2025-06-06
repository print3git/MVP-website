async function getShippingEstimate(destination, model) {
  const weight = model.weight || 1;
  const cost = 5 + weight * 2; // simple placeholder cost calculation
  const etaDays = 7; // placeholder ETA
  return { cost, etaDays };
}

module.exports = { getShippingEstimate };
