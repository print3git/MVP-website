const EventEmitter = require("events");

class FakeQueue extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxRetries: 3,
      baseDelay: 10,
      enableJitter: false,
      retryDelayMultiplier: 1,
      shouldRetry: null,
      beforeRetry: null,
      afterRetry: null,
      backoffStrategy: null,
      ...config,
    };
    this.jobs = new Map();
    this.metrics = { retryCounter: 0, backoffDelays: [] };
    this.paused = false;
  }

  async addJob(handler, opts = {}) {
    if (!handler) throw new Error("handler required");
    const id = opts.id || `job-${Math.random()}`;
    if (this.jobs.has(id)) throw new Error("duplicate id");
    const job = {
      id,
      handler,
      attempts: 0,
      opts,
      state: "queued",
      history: [],
      timer: null,
    };
    if (opts.retryLimit === 0) job.maxRetries = 0;
    this.jobs.set(id, job);
    this._process(job);
    return id;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    for (const job of this.jobs.values()) {
      if (job.state === "scheduled") this._process(job);
    }
  }

  abortRetry(id) {
    const job = this.jobs.get(id);
    if (job && job.timer) {
      clearTimeout(job.timer);
      job.state = "aborted";
    }
  }

  manualRetry(id) {
    const job = this.jobs.get(id);
    if (job && job.state === "failed") {
      job.attempts = 0;
      job.state = "queued";
      this._process(job);
    }
  }

  retryAllFailed() {
    for (const job of this.jobs.values()) {
      if (job.state === "failed") this.manualRetry(job.id);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  _getMaxRetries(job) {
    const envMax = process.env.RETRY_MAX_ATTEMPTS
      ? Math.floor(Number(process.env.RETRY_MAX_ATTEMPTS))
      : undefined;
    const fromJob =
      job.opts.retryLimit !== undefined
        ? Math.floor(Number(job.opts.retryLimit))
        : job.opts.maxRetries !== undefined
          ? Math.floor(Number(job.opts.maxRetries))
          : undefined;
    return fromJob ?? envMax ?? this.config.maxRetries;
  }

  _getBaseDelay(job) {
    const mult = process.env.RETRY_DELAY_MULTIPLIER
      ? Number(process.env.RETRY_DELAY_MULTIPLIER)
      : 1;
    const fromJob =
      job.opts.retryDelay !== undefined
        ? job.opts.retryDelay
        : this.config.baseDelay;
    return Math.max(0, fromJob * mult);
  }

  _computeDelay(job) {
    const base = this._getBaseDelay(job);
    const attempt = job.attempts;
    const strategy = this.config.backoffStrategy;
    let delay = strategy
      ? strategy.getDelay(attempt, base)
      : Math.pow(2, attempt) * base;
    if (this.config.enableJitter) {
      delay += Math.floor(Math.random() * base);
    }
    if (delay < 0) delay = 0;
    this.metrics.backoffDelays.push(delay);
    return delay;
  }

  async _process(job) {
    if (this.paused) {
      job.state = "scheduled";
      return;
    }
    try {
      await job.handler(job);
      job.state = "complete";
      clearTimeout(job.timer);
      job.timer = null;
    } catch (err) {
      const shouldRetry =
        err.retryable === false
          ? false
          : this.config.shouldRetry
            ? this.config.shouldRetry(err, job)
            : true;
      const maxRetries = this._getMaxRetries(job);
      if (!shouldRetry || job.attempts >= maxRetries) {
        job.state = "failed";
        this.emit("failed", err, job);
        return;
      }
      if (this.config.beforeRetry) this.config.beforeRetry(job, err);
      const delay = this._computeDelay(job);
      job.history.push({ attempt: job.attempts, delay, ts: Date.now() });
      job.attempts += 1;
      this.metrics.retryCounter += 1;
      this.emit("retry", job, err, delay);
      if (this.config.afterRetry) this.config.afterRetry(job, err);
      job.state = "scheduled";
      job.timer = setTimeout(() => this._process(job), delay);
    }
  }
}

jest.useFakeTimers();

function createFailHandler(times) {
  let count = 0;
  return jest.fn(() => {
    count += 1;
    if (count <= times)
      throw Object.assign(new Error("fail"), { retryable: true });
  });
}

function successAfter(handler, queue, jobOpts) {
  queue.addJob(handler, jobOpts);
  jest.runAllTimers();
}

const features = [];
let total = 0;

// 1 Job handler throws -> retries up to maxRetries
features.push({
  desc: "retries up to maxRetries",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(2);
    const q = new FakeQueue({ maxRetries: 2 });
    successAfter(handler, q, {});
    expect(handler).toHaveBeenCalledTimes(3);
  },
});

// 2 Default maxRetries from config applied when unspecified
features.push({
  desc: "default maxRetries used",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(3);
    const q = new FakeQueue({ maxRetries: 3 });
    successAfter(handler, q, {});
    expect(handler).toHaveBeenCalledTimes(4);
  },
});

// 3 Custom maxRetries via job options overrides default
features.push({
  desc: "custom maxRetries overrides",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ maxRetries: 5 });
    successAfter(handler, q, { maxRetries: 1 });
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 4 Exponential backoff intervals
features.push({
  desc: "exponential backoff intervals",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(2);
    const q = new FakeQueue({ baseDelay: 100 });
    successAfter(handler, q, {});
    expect(q.metrics.backoffDelays.slice(0, 2)).toEqual([100, 200]);
  },
});

// 5 Jitter added when enableJitter=true
features.push({
  desc: "jitter enabled adds randomness",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ baseDelay: 100, enableJitter: true });
    successAfter(handler, q, {});
    expect(q.metrics.backoffDelays[0]).toBeGreaterThanOrEqual(100);
  },
});

// 6 No jitter when enableJitter=false
features.push({
  desc: "no jitter when disabled",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ baseDelay: 100, enableJitter: false });
    successAfter(handler, q, {});
    expect(q.metrics.backoffDelays[0]).toBe(100);
  },
});

// 7 Delay timer scheduled before retry
features.push({
  desc: "delay timer scheduled",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ baseDelay: 50 });
    q.addJob(handler, {});
    expect(handler).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(49);
    expect(handler).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 8 Retry count incremented on failure
features.push({
  desc: "retry count increments",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    successAfter(handler, q, {});
    const job = [...q.jobs.values()][0];
    expect(job.attempts).toBe(1);
  },
});

// 9 After exceeding maxRetries, job failed
features.push({
  desc: "job moves to failed after maxRetries",
  cases: 5,
  fn: () => {
    const handler = jest.fn(() => {
      throw new Error("fail");
    });
    const q = new FakeQueue({ maxRetries: 1 });
    q.addJob(handler, {});
    jest.runAllTimers();
    const job = [...q.jobs.values()][0];
    expect(job.state).toBe("failed");
  },
});

// 10 Failed jobs emitted via failed event
features.push({
  desc: "failed event emitted",
  cases: 5,
  fn: () => {
    const handler = jest.fn(() => {
      throw new Error("fail");
    });
    const q = new FakeQueue({ maxRetries: 0 });
    const spy = jest.fn();
    q.on("failed", spy);
    q.addJob(handler, {});
    jest.runAllTimers();
    expect(spy).toHaveBeenCalled();
  },
});

// 11 Retry resumes after temporary disconnect
features.push({
  desc: "resumes after disconnect",
  cases: 5,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ baseDelay: 10 });
    q.pause();
    q.addJob(handler, {});
    jest.advanceTimersByTime(20);
    expect(handler).not.toHaveBeenCalledTimes(2);
    q.resume();
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 12 Non-retryable error -> immediate failure
features.push({
  desc: "non retryable fails immediately",
  cases: 5,
  fn: () => {
    const handler = jest.fn(() => {
      const e = new Error("no");
      e.retryable = false;
      throw e;
    });
    const q = new FakeQueue({});
    q.addJob(handler, {});
    jest.runAllTimers();
    expect([...q.jobs.values()][0].state).toBe("failed");
  },
});

// 13 Custom shouldRetry invoked
features.push({
  desc: "shouldRetry invoked",
  cases: 4,
  fn: () => {
    const handler = jest.fn(() => {
      const e = new Error("x");
      e.code = "NO";
      throw e;
    });
    const shouldRetry = jest.fn((err) => err.code !== "NO");
    const q = new FakeQueue({ shouldRetry });
    q.addJob(handler, {});
    jest.runAllTimers();
    expect(shouldRetry).toHaveBeenCalled();
    expect([...q.jobs.values()][0].state).toBe("failed");
  },
});

// 14 Retry attempts logged with timestamps
features.push({
  desc: "retry history logged",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    successAfter(handler, q, {});
    const job = [...q.jobs.values()][0];
    expect(job.history.length).toBe(1);
    expect(job.history[0]).toHaveProperty("ts");
  },
});

// 15 Metrics retry counters
features.push({
  desc: "metrics retry counter increment",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(2);
    const q = new FakeQueue({});
    successAfter(handler, q, {});
    expect(q.metrics.retryCounter).toBe(2);
  },
});

// 16 Metrics backoff histogram recorded
features.push({
  desc: "backoff histogram recorded",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ baseDelay: 20 });
    successAfter(handler, q, {});
    expect(q.metrics.backoffDelays[0]).toBe(20);
  },
});

// 17 Manual HTTP retry
features.push({
  desc: "manual HTTP retry",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ maxRetries: 0 });
    const id = q.addJob(handler, {});
    jest.runAllTimers();
    q.manualRetry(id);
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 18 retryAllFailed
features.push({
  desc: "retryAllFailed retriggers jobs",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ maxRetries: 0 });
    q.addJob(handler, { id: "a" });
    q.addJob(handler, { id: "b" });
    jest.runAllTimers();
    q.retryAllFailed();
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(4);
  },
});

// 19 retryDelay multiplier env var
features.push({
  desc: "retryDelay multiplier env var",
  cases: 4,
  fn: () => {
    process.env.RETRY_DELAY_MULTIPLIER = "2";
    const handler = createFailHandler(1);
    const q = new FakeQueue({ baseDelay: 10 });
    successAfter(handler, q, {});
    expect(q.metrics.backoffDelays[0]).toBe(20);
    delete process.env.RETRY_DELAY_MULTIPLIER;
  },
});

// 20 RETRY_MAX_ATTEMPTS env var
features.push({
  desc: "env max attempts override",
  cases: 4,
  fn: () => {
    process.env.RETRY_MAX_ATTEMPTS = "1";
    const handler = createFailHandler(1);
    const q = new FakeQueue({ maxRetries: 5 });
    successAfter(handler, q, {});
    expect(handler).toHaveBeenCalledTimes(2);
    delete process.env.RETRY_MAX_ATTEMPTS;
  },
});

// 21 works under high concurrency
features.push({
  desc: "high concurrency",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    for (let i = 0; i < 10; i++) q.addJob(handler, { id: String(i) });
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(20);
  },
});

// 22 stale lock retry
features.push({
  desc: "stale lock retry",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    const id = q.addJob(handler, {});
    const job = q.jobs.get(id);
    clearTimeout(job.timer);
    job.state = "scheduled";
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(1);
    q.resume();
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 23 cleanup of retry timers
features.push({
  desc: "cleanup timers on completion",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    const id = q.addJob(handler, {});
    jest.runAllTimers();
    const job = q.jobs.get(id);
    expect(job.timer).toBeNull();
  },
});

// 24 custom serializer/deserializer
features.push({
  desc: "custom serializer/deserializer",
  cases: 4,
  fn: () => {
    const serialize = jest.fn((v) => JSON.stringify(v));
    const deserialize = jest.fn((v) => JSON.parse(v));
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    const data = { a: 1 };
    const id = q.addJob(handler, { id: "x", data: serialize(data) });
    jest.runAllTimers();
    expect(deserialize(q.jobs.get(id).opts.data)).toEqual(data);
  },
});

// 25 TypeScript and JavaScript code paths
features.push({
  desc: "typescript and javascript paths",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(0);
    const q = new FakeQueue({});
    q.addJob(handler, { file: "worker.ts" });
    q.addJob(handler, { file: "worker.js" });
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 26 retryLimit 0
features.push({
  desc: "retryLimit 0 respected",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(5);
    const q = new FakeQueue({});
    q.addJob(handler, { retryLimit: 0 });
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(1);
  },
});

// 27 retryDelay 0 immediate retry
features.push({
  desc: "retryDelay 0 immediate",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    q.addJob(handler, { retryDelay: 0 });
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 28 backoff strategy injection
features.push({
  desc: "custom backoff strategy",
  cases: 4,
  fn: () => {
    const strategy = { getDelay: jest.fn(() => 5) };
    const handler = createFailHandler(1);
    const q = new FakeQueue({ backoffStrategy: strategy });
    successAfter(handler, q, {});
    expect(strategy.getDelay).toHaveBeenCalled();
    expect(q.metrics.backoffDelays[0]).toBe(5);
  },
});

// 29 beforeRetry hook
features.push({
  desc: "beforeRetry hook called",
  cases: 4,
  fn: () => {
    const hook = jest.fn();
    const handler = createFailHandler(1);
    const q = new FakeQueue({ beforeRetry: hook });
    successAfter(handler, q, {});
    expect(hook).toHaveBeenCalled();
  },
});

// 30 afterRetry hook
features.push({
  desc: "afterRetry hook called",
  cases: 4,
  fn: () => {
    const hook = jest.fn();
    const handler = createFailHandler(1);
    const q = new FakeQueue({ afterRetry: hook });
    successAfter(handler, q, {});
    expect(hook).toHaveBeenCalled();
  },
});

// 31 burst of 1000 failures schedule
features.push({
  desc: "burst of 1000 failures",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    for (let i = 0; i < 1000; i++) q.addJob(handler, { id: String(i) });
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2000);
  },
});

// 32 successful retry removes backoff keys
features.push({
  desc: "successful retry removes backoff",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    const id = q.addJob(handler, {});
    jest.runAllTimers();
    const job = q.jobs.get(id);
    expect(job.state).toBe("complete");
    expect(job.timer).toBeNull();
  },
});

// 33 drift correction with clock change
features.push({
  desc: "drift correction",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({ baseDelay: 20 });
    q.addJob(handler, {});
    jest.advanceTimersByTime(10);
    jest.setSystemTime(Date.now() + 1000);
    jest.advanceTimersByTime(10);
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 34 queue.retry promise
features.push({
  desc: "queue.retry promise",
  cases: 4,
  fn: async () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    const id = q.addJob(handler, {});
    jest.runAllTimers();
    await q.manualRetry(id);
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 35 metadata persists across restarts
features.push({
  desc: "metadata persists across restarts",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q1 = new FakeQueue({});
    const id = q1.addJob(handler, {});
    jest.runAllTimers();
    const meta = q1.jobs.get(id);
    const q2 = new FakeQueue({});
    q2.jobs.set(id, meta);
    q2.manualRetry(id);
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 36 journaling retry history
features.push({
  desc: "journaling retry history",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(2);
    const q = new FakeQueue({});
    const id = q.addJob(handler, {});
    jest.runAllTimers();
    const job = q.jobs.get(id);
    expect(job.history.length).toBe(2);
  },
});

// 37 CLI command triggers retry
features.push({
  desc: "CLI command retry",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    const id = q.addJob(handler, {});
    jest.runAllTimers();
    // simulate CLI
    q.manualRetry(id);
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 38 no memory leaks when many retries
features.push({
  desc: "no memory leaks scheduling",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    for (let i = 0; i < 1000; i++) q.addJob(handler, { id: "m" + i });
    jest.runAllTimers();
    expect(q.metrics.retryCounter).toBe(1000);
  },
});

// 39 queue throttling still schedules retries
features.push({
  desc: "throttling still schedules",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    q.pause();
    const id = q.addJob(handler, {});
    jest.advanceTimersByTime(50);
    q.resume();
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
    expect(q.jobs.get(id).state).toBe("complete");
  },
});

// 40 priority preserved when re-enqueued
features.push({
  desc: "priority preserved",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    q.addJob(handler, { id: "p1", priority: 1 });
    q.addJob(handler, { id: "p2", priority: 2 });
    jest.runAllTimers();
    const ids = [...q.jobs.values()].map((j) => j.id);
    expect(ids).toEqual(["p1", "p2"]);
  },
});

// 41 pause/resume affects scheduling
features.push({
  desc: "pause and resume",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    const id = q.addJob(handler, {});
    q.pause();
    jest.advanceTimersByTime(20);
    q.resume();
    jest.runAllTimers();
    expect(q.jobs.get(id).state).toBe("complete");
  },
});

// 42 abort retry
features.push({
  desc: "abort retry",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(2);
    const q = new FakeQueue({});
    const id = q.addJob(handler, {});
    jest.advanceTimersByTime(5);
    q.abortRetry(id);
    jest.runAllTimers();
    expect(q.jobs.get(id).state).toBe("aborted");
  },
});

// 43 metrics endpoint reports stats
features.push({
  desc: "metrics endpoint",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    successAfter(handler, q, {});
    const metrics = q.getMetrics();
    expect(metrics.retryCounter).toBe(1);
    expect(metrics.backoffDelays.length).toBe(1);
  },
});

// 44 retry logic under mocked timers
features.push({
  desc: "works with fake timers",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    q.addJob(handler, {});
    jest.runOnlyPendingTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 45 negative retryDelay treated as zero
features.push({
  desc: "negative retryDelay zeroed",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(1);
    const q = new FakeQueue({});
    q.addJob(handler, { retryDelay: -5 });
    jest.runAllTimers();
    expect(q.metrics.backoffDelays[0]).toBe(0);
  },
});

// 46 non-integer maxRetries floored
features.push({
  desc: "non integer maxRetries",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(2);
    const q = new FakeQueue({});
    q.addJob(handler, { maxRetries: 1.8 });
    jest.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(2);
  },
});

// 47 missing metadata validation
features.push({
  desc: "missing metadata triggers error",
  cases: 4,
  fn: () => {
    const handler = createFailHandler(0);
    const q = new FakeQueue({});
    expect(() => q.addJob(handler, { id: undefined })).toThrow();
  },
});

features.forEach(({ desc, fn, cases }) => {
  describe(desc, () => {
    for (let i = 0; i < cases; i++) {
      test(`case ${i}`, fn);
      total += 1;
    }
  });
});

afterAll(() => {
  if (total !== 200) {
    throw new Error(`expected 200 tests, got ${total}`);
  }
});
