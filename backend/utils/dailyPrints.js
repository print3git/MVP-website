const MIN = 30;
const MAX = 50;
let dailyPrintsSold = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;

function scheduleNextUpdate() {
  const now = new Date();
  const offsetMs =
    new Date(
      now.toLocaleString('en-US', {
        timeZone: 'America/New_York',
      })
    ) - now;
  const easternNow = new Date(now.getTime() + offsetMs);
  const next = new Date(easternNow);
  next.setHours(23, 59, 0, 0);
  if (easternNow >= next) {
    next.setDate(next.getDate() + 1);
  }
  const ms = next - easternNow;
  setTimeout(() => {
    dailyPrintsSold = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    scheduleNextUpdate();
  }, ms);
}

function initDailyPrintsSold() {
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
