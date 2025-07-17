const RetryQueue = require("../backend/queue/retryQueue");
const { EventEmitter } = require("events");

function failNTimes(times, { code = "E", async = false } = {}) {
  let count = 0;
  const fn = async () => {
    if (count < times) {
      count++;
      const err = new Error("fail");
      err.code = code;
      throw err;
    }
  };
  return async ? jest.fn(fn) : jest.fn(() => fn());
}

function emitterFailNTimes(times) {
  const emitter = new EventEmitter();
  let count = 0;
  emitter.start = () => {
    if (count < times) {
      count++;
      emitter.emit("error", new Error("fail"));
    } else {
      emitter.emit("done");
    }
  };
  return emitter;
}

describe("retry up to maxRetries", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 8; i++) {
    test(`retry ${i}`, async () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const h = failNTimes(2);
      q.add({ id: "j" + i, handler: h, maxRetries: 2 });
      jest.runAllTimers();
      await Promise.resolve();
      expect(h).toHaveBeenCalledTimes(3);
    });
  }
});

describe("exponential backoff", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 8; i++) {
    test(`exp ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 10 });
      const spy = jest.spyOn(global, "setTimeout");
      const h = failNTimes(1);
      q.add({ id: "x" + i, handler: h, maxRetries: 1 });
      jest.runOnlyPendingTimers();
      expect(spy.mock.calls.some((c) => c[1] === 20)).toBe(true);
      spy.mockRestore();
    });
  }
});

describe("custom backoff strategy", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`custom ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 10 });
      q.setBackoffStrategy((a, b) => b + a * 5);
      const spy = jest.spyOn(global, "setTimeout");
      const h = failNTimes(1);
      q.add({ id: "c" + i, handler: h, maxRetries: 1 });
      jest.runOnlyPendingTimers();
      expect(spy.mock.calls.some((c) => c[1] === 15)).toBe(true);
      spy.mockRestore();
    });
  }
});

describe("immediate retry", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`immediate ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 10 });
      const spy = jest.spyOn(global, "setTimeout");
      const h = failNTimes(1);
      q.add({
        id: "im" + i,
        handler: h,
        maxRetries: 1,
        retryImmediately: true,
      });
      jest.runOnlyPendingTimers();
      expect(spy.mock.calls.some((c) => c[1] === 0)).toBe(true);
      spy.mockRestore();
    });
  }
});

describe("jitter backoff", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0.75);
  });
  afterEach(() => {
    jest.useRealTimers();
    Math.random.mockRestore();
  });
  for (let i = 0; i < 6; i++) {
    test(`jitter ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 100 });
      const spy = jest.spyOn(global, "setTimeout");
      const h = failNTimes(1);
      q.add({ id: "j" + i, handler: h, maxRetries: 1, jitter: 0.2 });
      jest.runOnlyPendingTimers();
      expect(spy.mock.calls.some((c) => c[1] === 220)).toBe(true);
      spy.mockRestore();
    });
  }
});

describe("linear backoff", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`linear ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 10 });
      const spy = jest.spyOn(global, "setTimeout");
      const h = failNTimes(1);
      q.add({ id: "l" + i, handler: h, maxRetries: 1, linearIncrement: 5 });
      jest.runOnlyPendingTimers();
      expect(spy.mock.calls.some((c) => c[1] === 15)).toBe(true);
      spy.mockRestore();
    });
  }
});

describe("retry on specific error codes", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`codes ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 10 });
      const spy = jest.spyOn(global, "setTimeout");
      const h = failNTimes(1, { code: "ETIMEDOUT" });
      q.add({
        id: "e" + i,
        handler: h,
        maxRetries: 1,
        allowedErrorCodes: ["ETIMEDOUT"],
      });
      jest.runOnlyPendingTimers();
      expect(spy.mock.calls.some((c) => c[1] === 20)).toBe(true);
      spy.mockRestore();
    });
  }
});

describe("no retry on fatal errors", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`fatal ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 10 });
      const spy = jest.spyOn(global, "setTimeout");
      const h = failNTimes(1, { code: "EFATAL" });
      q.add({
        id: "f" + i,
        handler: h,
        maxRetries: 1,
        allowedErrorCodes: ["ETIMEDOUT"],
      });
      jest.runOnlyPendingTimers();
      expect(spy.mock.calls.some((c) => c[1] === 20)).toBe(false);
      spy.mockRestore();
    });
  }
});

describe("retry count reset on success", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`reset ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 10 });
      const h = failNTimes(1);
      q.add({ id: "r" + i, handler: h, maxRetries: 1 });
      jest.runAllTimers();
      expect(q.redis.size).toBe(0);
    });
  }
});

describe("retryDelay env var", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    process.env.RETRY_DELAY = "50";
  });
  afterEach(() => {
    jest.useRealTimers();
    delete process.env.RETRY_DELAY;
  });
  for (let i = 0; i < 6; i++) {
    test(`env ${i}`, () => {
      const q = new RetryQueue();
      expect(q.baseDelay).toBe(50);
    });
  }
});

describe("dynamic maxRetries per job", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`dynamic ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1, maxRetries: 1 });
      const h = failNTimes(2);
      q.add({ id: "d" + i, handler: h, maxRetries: 2 });
      jest.runAllTimers();
      expect(h).toHaveBeenCalledTimes(3);
    });
  }
});

describe("retry metadata TTL", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`ttl ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1, ttl: 5 });
      const h = failNTimes(1);
      q.add({ id: "t" + i, handler: h, maxRetries: 1 });
      jest.advanceTimersByTime(6);
      expect(q.redis.size).toBe(0);
    });
  }
});

describe("persistence across restarts", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`persist ${i}`, () => {
      const store = new Map();
      const q1 = new RetryQueue({ baseDelay: 1, ttl: 100, redis: store });
      const h = failNTimes(1);
      q1.add({ id: "p" + i, handler: h, maxRetries: 1 });
      const q2 = new RetryQueue({ baseDelay: 1, ttl: 100, redis: store });
      expect(q2.redis.size).toBe(1);
    });
  }
});

describe("crash vs throw", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`crash ${i}`, async () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const h = failNTimes(1, { async: true });
      q.add({ id: "cr" + i, handler: h, maxRetries: 1 });
      jest.runAllTimers();
      await Promise.resolve();
      expect(h).toHaveBeenCalledTimes(2);
    });
  }
});

describe("high concurrency", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`concurrency ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      for (let j = 0; j < 150; j++) {
        q.add({ id: `hc${i}-${j}`, handler: failNTimes(1), maxRetries: 1 });
      }
      jest.runOnlyPendingTimers();
      expect(q.retryQueueLength).toBe(150);
    });
  }
});

describe("retry queue length metrics", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`metrics ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      q.add({ id: "m1" + i, handler: failNTimes(1), maxRetries: 1 });
      q.add({ id: "m2" + i, handler: failNTimes(1), maxRetries: 1 });
      jest.runOnlyPendingTimers();
      expect(q.metrics().retryQueueLength).toBe(2);
    });
  }
});

describe("retry event payload", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`event ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const events = [];
      q.on("retry", (e) => events.push(e));
      q.add({ id: "ev" + i, handler: failNTimes(1), maxRetries: 1 });
      jest.runOnlyPendingTimers();
      expect(events[0]).toMatchObject({ jobId: "ev" + i, attempt: 1 });
    });
  }
});

describe("neverRetry option", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`never ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      q.add({
        id: "n" + i,
        handler: failNTimes(1),
        maxRetries: 1,
        neverRetry: true,
      });
      jest.runOnlyPendingTimers();
      expect(q.retryQueueLength).toBe(0);
    });
  }
});

describe("manual retry API", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`manual ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const h = failNTimes(1);
      q.add({ id: "ma" + i, handler: h, maxRetries: 1 });
      q.retry("ma" + i);
      jest.runAllTimers();
      expect(h).toHaveBeenCalledTimes(2);
    });
  }
});

describe("CLI retry behavior", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`cli ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const h = failNTimes(1);
      q.add({ id: "cli" + i, handler: h, maxRetries: 1 });
      q.retry("cli" + i);
      jest.runAllTimers();
      expect(h).toHaveBeenCalledTimes(2);
    });
  }
});

describe("cancelRetries", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`cancel ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const h = failNTimes(1);
      q.add({ id: "ca" + i, handler: h, maxRetries: 1 });
      q.cancelRetries("ca" + i);
      jest.runOnlyPendingTimers();
      expect(h).toHaveBeenCalledTimes(1);
    });
  }
});

describe("failure notifications plugin", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`plugin ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const alerts = new Set();
      q.on("retry", (e) => alerts.add(e.jobId));
      q.add({ id: "pl" + i, handler: failNTimes(2), maxRetries: 2 });
      jest.runOnlyPendingTimers();
      expect(alerts.size).toBe(1);
    });
  }
});

describe("batch processing", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`batch ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const h1 = failNTimes(1);
      const h2 = failNTimes(1);
      const h3 = failNTimes(1);
      q.add({ id: `b1${i}`, handler: h1, maxRetries: 1 });
      q.add({ id: `b2${i}`, handler: h2, maxRetries: 1 });
      q.add({ id: `b3${i}`, handler: h3, maxRetries: 1 });
      jest.runOnlyPendingTimers();
      expect(h1).toHaveBeenCalledTimes(2);
      expect(h2).toHaveBeenCalledTimes(2);
      expect(h3).toHaveBeenCalledTimes(2);
    });
  }
});

describe("rate limits", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`rate ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1, rateLimit: 1 });
      const order = [];
      q.add({
        id: `rl1${i}`,
        handler: () => {
          order.push(1);
          throw new Error();
        },
        maxRetries: 1,
      });
      q.add({
        id: `rl2${i}`,
        handler: () => {
          order.push(2);
          throw new Error();
        },
        maxRetries: 1,
      });
      jest.runOnlyPendingTimers();
      expect(order[0]).toBe(1);
    });
  }
});

describe("hard limit", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`limit ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1, hardMaxRetries: 5 });
      expect(() =>
        q.add({ id: "h" + i, handler: failNTimes(1), maxRetries: 6 }),
      ).toThrow();
    });
  }
});

describe("/metrics/retries", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`metrics ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      q.add({ id: "mr" + i, handler: failNTimes(1), maxRetries: 1 });
      jest.runOnlyPendingTimers();
      expect(q.metrics().retries).toBe(1);
    });
  }
});

describe("constructor backoff strategy", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`ctor ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 10, backoffStrategy: () => 5 });
      const spy = jest.spyOn(global, "setTimeout");
      q.add({ id: "ct" + i, handler: failNTimes(1), maxRetries: 1 });
      jest.runOnlyPendingTimers();
      expect(spy.mock.calls.some((c) => c[1] === 5)).toBe(true);
      spy.mockRestore();
    });
  }
});

describe("no memory leak", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`leak ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const h = failNTimes(1);
      for (let j = 0; j < 50; j++) {
        q.add({ id: `lk${i}-${j}`, handler: h, maxRetries: 1 });
      }
      jest.runAllTimers();
      expect(q.redis.size).toBe(0);
    });
  }
});

describe("async handler", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`async ${i}`, async () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const h = failNTimes(1, { async: true });
      q.add({ id: "as" + i, handler: h, maxRetries: 1 });
      jest.runAllTimers();
      await Promise.resolve();
      expect(h).toHaveBeenCalledTimes(2);
    });
  }
});

describe("emitter error", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`emitter ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      const handler = emitterFailNTimes(1);
      q.add({ id: "em" + i, handler, maxRetries: 1 });
      jest.runOnlyPendingTimers();
      expect(q.retryQueueLength).toBe(1);
    });
  }
});

describe("integration 1000 jobs", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 8; i++) {
    test(`integration ${i}`, () => {
      const q = new RetryQueue({ baseDelay: 1 });
      for (let j = 0; j < 1000; j++) {
        q.add({ id: `ig${i}-${j}`, handler: failNTimes(1), maxRetries: 1 });
      }
      jest.runAllTimers();
      expect(q.metrics().retries).toBe(1000);
    });
  }
});
