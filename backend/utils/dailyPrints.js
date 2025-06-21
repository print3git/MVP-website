const crypto = require("crypto");

const MIN = 30;
const MAX = 50;
let dailyPrintsSold = 0;

/**
 * Derive a pseudo-random number of prints sold for a given date.
 *
 * @param {Date} [date=new Date()] - Date to base the calculation on.
 * @returns {number} Estimated number of prints sold.
 */
function computeDailyPrintsSold(date = new Date()) {
  const eastern = new Date(
    date.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const dateStr = eastern.toISOString().slice(0, 10); // YYYY-MM-DD
  const hash = crypto.createHash("sha256").update(dateStr).digest("hex");
  const int = parseInt(hash.slice(0, 8), 16);
  const rand = int / 0xffffffff;
  return Math.floor(rand * (MAX - MIN + 1)) + MIN;
}

/**
 * Schedule the next daily prints update at midnight Eastern time.
 * @private
 */
function scheduleNextUpdate() {
  const now = new Date();
  const easternNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const next = new Date(easternNow);
  next.setHours(24, 0, 0, 0);
  if (easternNow >= next) {
    next.setDate(next.getDate() + 1);
  }
  const ms = next - easternNow;
  setTimeout(() => {
    dailyPrintsSold = computeDailyPrintsSold();
    scheduleNextUpdate();
  }, ms);
}

/**
 * Initialise the daily prints counter and schedule periodic updates.
 */
function initDailyPrintsSold() {
  dailyPrintsSold = computeDailyPrintsSold();
  scheduleNextUpdate();
}

/**
 * Retrieve the cached number of prints sold today.
 *
 * @returns {number} Current daily print count.
 */
function getDailyPrintsSold() {
  return dailyPrintsSold;
}

/**
 * Force-set the number of prints sold (for tests).
 *
 * @param {number} val - New value to store.
 * @private
 */
function _setDailyPrintsSold(val) {
  dailyPrintsSold = val;
}

module.exports = {
  initDailyPrintsSold,
  getDailyPrintsSold,
  _setDailyPrintsSold,
};
