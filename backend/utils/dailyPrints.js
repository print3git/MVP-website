const crypto = require('crypto');

const MIN = 30;
const MAX = 50;
let dailyPrintsSold = 0;

function getEasternDateStr(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;
  return `${year}-${month}-${day}`; // YYYY-MM-DD
}

function computeDailyPrintsSold(date = new Date()) {
  const dateStr = getEasternDateStr(date);
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
  getEasternDateStr,
};
