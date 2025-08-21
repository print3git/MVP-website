function freeze(date = new Date("2020-01-01T00:00:00Z")) {
  jest.useFakeTimers().setSystemTime(date);
}

function restore() {
  jest.useRealTimers();
}

module.exports = { freeze, restore };
