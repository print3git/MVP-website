function hasOrderedBefore(_userId) {
  // placeholder DB call
  return true;
}

function firstOrderPrice(_userId, basePrice) {
  // pretend you’ve wired up a `hasOrderedBefore` DB call
  return hasOrderedBefore(_userId) ? basePrice : Math.round(basePrice * 0.9);
}

function referralPrintPrice(referralCount, basePrice) {
  // free print at 3 referrals
  return referralCount >= 3 ? 0 : basePrice;
}

module.exports = {
  firstOrderPrice,
  referralPrintPrice,
};
