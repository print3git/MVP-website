const crypto = require('crypto');

const MIN = 30;
const MAX = 50;
let dailyPrintsSold = 0;

function computeDailyPrintsSold(date = new Date()) {
  const eastern = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dateStr = eastern.toISOString().slice(0, 10); // YYYY-MM-DD
  const hash = crypto.createHash('sha256').update(dateStr).digest('hex');
  const int = parseInt(hash.slice(0, 8), 16);
  const rand = int / 0xffffffff;
  return Math.floor(rand * (MAX - MIN + 1)) + MIN;
}

function scheduleNextUpdate() {
  const now = new Date();
  const easternNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
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

function initDailyPrintsSold() {
  dailyPrintsSold = computeDailyPrintsSold();
  scheduleNextUpdate();
}

function getDailyPrintsSold() {
  return dailyPrintsSold;
}

function _setDailyPrintsSold(val) {
  dailyPrintsSold = val;
}

module.exports = {
  initDailyPrintsSold,
  getDailyPrintsSold,
  _setDailyPrintsSold,
};
