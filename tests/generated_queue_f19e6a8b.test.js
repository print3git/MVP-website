const {
  enqueuePrint,
  processQueue,
  _getQueue,
  progressEmitter,
} = require("../backend/queue/printQueue.js");

describe("enqueuePrint adds", () => {
  beforeEach(() => {
    _getQueue().length = 0;
  });
  for (let i = 0; i < 200; i++) {
    test(`add ${i}`, () => {
      enqueuePrint("job" + i);
      expect(_getQueue()[_getQueue().length - 1]).toBe("job" + i);
    });
  }
});

describe("progress events", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    _getQueue().length = 0;
  });
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 200; i++) {
    test(`progress ${i}`, () => {
      const events = [];
      function listener(e) {
        events.push(e.progress);
      }
      progressEmitter.on("progress", listener);
      enqueuePrint("job" + i);
      jest.advanceTimersByTime(500);
      progressEmitter.off("progress", listener);
      expect(events.length).toBeGreaterThan(0);
    });
  }
});

describe("processQueue idle", () => {
  beforeEach(() => {
    _getQueue().length = 0;
  });
  for (let i = 0; i < 100; i++) {
    test(`idle ${i}`, () => {
      processQueue();
      expect(_getQueue().length).toBe(0);
    });
  }
});
