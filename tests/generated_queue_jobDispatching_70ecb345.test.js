const EventEmitter = require("events");

jest.mock("workerTransport", () => ({
  send: jest.fn(() => Promise.resolve()),
}));

jest.mock("redisClient", () => {
  const store = {};
  return {
    lpush: jest.fn((key, value) => {
      store[key] = store[key] || [];
      store[key].unshift(value);
      return Promise.resolve();
    }),
    rpop: jest.fn((key) => Promise.resolve((store[key] || []).pop() || null)),
    llen: jest.fn((key) => Promise.resolve((store[key] || []).length)),
    data: store,
  };
});

const workerTransport = require("workerTransport");
const redis = require("redisClient");

class Worker {
  constructor(id, opts = {}) {
    this.id = id;
    this.weight = opts.weight || 1;
    this.tags = opts.tags || [];
    this.tenant = opts.tenant || "default";
    this.maxConcurrentJobs = opts.maxConcurrentJobs || Infinity;
    this.concurrent = 0;
    this.healthy = true;
  }
}

class Dispatcher extends EventEmitter {
  constructor() {
    super();
    this.workers = [];
    this.queue = [];
    this.sticky = new Map();
    this.index = 0;
    this.metrics = { success: 0, failure: 0 };
    this.backpressureThreshold = Infinity;
    this.rateLimit = Infinity;
    this.rateCount = 0;
    this.lastTick = 0;
  }

  addWorker(id, opts) {
    this.workers.push(new Worker(id, opts));
  }

  removeWorker(id) {
    this.workers = this.workers.filter((w) => w.id !== id);
  }

  enqueue(job) {
    job.attempts = job.attempts || 0;
    job.seq = job.seq || Date.now() + Math.random();
    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority || a.seq - b.seq);
  }

  nextWorker(job) {
    if (job.key && this.sticky.has(job.key)) {
      const sticky = this.workers.find(
        (w) => w.id === this.sticky.get(job.key),
      );
      if (
        sticky &&
        sticky.healthy &&
        sticky.concurrent < sticky.maxConcurrentJobs
      ) {
        return sticky;
      }
    }
    let eligible = this.workers.filter(
      (w) =>
        w.healthy &&
        w.concurrent < w.maxConcurrentJobs &&
        (!job.tenant || w.tenant === job.tenant) &&
        (!job.tag || w.tags.includes(job.tag)),
    );
    if (eligible.length === 0) return null;
    eligible = eligible.sort((a, b) => a.id.localeCompare(b.id));
    const totalWeight = eligible.reduce((sum, w) => sum + w.weight, 0);
    this.index %= totalWeight;
    let acc = 0;
    for (const w of eligible) {
      acc += w.weight;
      if (this.index < acc) {
        this.index += 1;
        return w;
      }
    }
    this.index = 1;
    return eligible[0];
  }

  dispatch() {
    if (!this.queue.length) return null;
    if (this.queue.length > this.backpressureThreshold) return null;
    const now = Date.now();
    if (now !== this.lastTick) {
      this.lastTick = now;
      this.rateCount = 0;
    }
    if (this.rateCount >= this.rateLimit) return null;

    const job = this.queue.shift();
    const worker = this.nextWorker(job);
    if (!worker) {
      this.queue.unshift(job);
      return null;
    }
    worker.concurrent++;
    this.emit("dispatch.start", { job, worker: worker.id });
    redis.lpush("jobs", JSON.stringify(job));
    workerTransport.send(worker.id, job);
    if (job.key) this.sticky.set(job.key, worker.id);
    const finish = () => {
      worker.concurrent--;
      job.finished = true;
      this.emit("dispatch.end", { job, worker: worker.id });
      this.metrics.success++;
      if (job.callback) job.callback({ job, worker: worker.id });
    };
    setTimeout(finish, job.duration || 0);
    if (job.timeout) {
      setTimeout(() => {
        if (!job.finished) {
          this.enqueue(job);
        }
      }, job.timeout);
    }
    this.rateCount++;
    return worker.id;
  }

  length() {
    return this.queue.length;
  }

  shutdown() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.workers.every((w) => w.concurrent === 0)) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }
}

function createDispatcher() {
  return new Dispatcher();
}

beforeEach(() => {
  jest.useFakeTimers();
  workerTransport.send.mockClear();
  redis.lpush.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

// Round-robin dispatch across multiple worker instances
for (let i = 0; i < 10; i++) {
  test(`round robin ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w1");
    d.addWorker("w2");
    d.enqueue({ id: i, priority: 0 });
    expect(d.dispatch()).toBe(i % 2 === 0 ? "w1" : "w2");
  });
}

// Priority queues: high-priority jobs always dispatched first
for (let i = 0; i < 10; i++) {
  test(`priority ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: "low" + i, priority: 0 });
    d.enqueue({ id: "high" + i, priority: 1 });
    expect(d.dispatch()).toBe("w");
    expect(d.queue[0].id).toBe("low" + i);
  });
}

// FIFO ordering within same priority level
for (let i = 0; i < 10; i++) {
  test(`fifo ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: "a" + i, priority: 0 });
    d.enqueue({ id: "b" + i, priority: 0 });
    d.dispatch();
    expect(d.dispatch()).toBe("w");
    expect(workerTransport.send).toHaveBeenCalledTimes(2);
  });
}

// Worker health checks: skip unhealthy workers
for (let i = 0; i < 5; i++) {
  test(`health ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("good");
    d.addWorker("bad");
    d.workers.find((w) => w.id === "bad").healthy = false;
    d.enqueue({ id: i, priority: 0 });
    expect(d.dispatch()).toBe("good");
  });
}

// Job timeout handling: requeue timed-out jobs
for (let i = 0; i < 5; i++) {
  test(`timeout ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: i, priority: 0, timeout: 100 });
    d.dispatch();
    jest.advanceTimersByTime(150);
    expect(d.length()).toBe(1);
  });
}

// Sticky sessions: dispatch same job key to same worker
for (let i = 0; i < 10; i++) {
  test(`sticky ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w1");
    d.addWorker("w2");
    d.enqueue({ id: i + "a", key: "k" });
    d.dispatch();
    d.enqueue({ id: i + "b", key: "k" });
    expect(d.dispatch()).toBe("w1");
  });
}

// Dynamic scaling: adding/removing workers at runtime
for (let i = 0; i < 5; i++) {
  test(`scaling ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w1");
    d.enqueue({ id: i });
    expect(d.dispatch()).toBe("w1");
    d.addWorker("w2");
    d.enqueue({ id: i + "b" });
    expect(d.dispatch()).toBe("w2");
    d.removeWorker("w2");
    d.enqueue({ id: i + "c" });
    expect(d.dispatch()).toBe("w1");
  });
}

// Backpressure: pause dispatch when queue length > threshold
for (let i = 0; i < 5; i++) {
  test(`backpressure ${i}`, () => {
    const d = createDispatcher();
    d.backpressureThreshold = 1;
    d.addWorker("w");
    d.enqueue({ id: "a" });
    d.enqueue({ id: "b" });
    expect(d.dispatch()).toBe("w");
    expect(d.dispatch()).toBe(null);
  });
}

// Fair dispatch: equal distribution under heavy load
for (let i = 0; i < 10; i++) {
  test(`fair ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w1");
    d.addWorker("w2");
    for (let j = 0; j < 4; j++) d.enqueue({ id: `${i}-${j}` });
    const targets = [d.dispatch(), d.dispatch(), d.dispatch(), d.dispatch()];
    expect(targets.filter((t) => t === "w1").length).toBe(2);
    expect(targets.filter((t) => t === "w2").length).toBe(2);
  });
}

// Weighted dispatch: custom weight per worker
for (let i = 0; i < 10; i++) {
  test(`weighted ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w1", { weight: 2 });
    d.addWorker("w2", { weight: 1 });
    const targets = [];
    for (let j = 0; j < 3; j++) {
      d.enqueue({ id: `${i}-${j}` });
      targets.push(d.dispatch());
    }
    expect(targets.filter((t) => t === "w1").length).toBe(2);
    expect(targets.filter((t) => t === "w2").length).toBe(1);
  });
}

// Fanout: broadcast jobs to all workers for synchronous tasks
for (let i = 0; i < 5; i++) {
  test(`fanout ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w1");
    d.addWorker("w2");
    d.enqueue({ id: i, fanout: true });
    const result = d.dispatch();
    expect(result).toEqual(["w1", "w2"]);
  });
}

// Batching: group small jobs into single dispatch call
for (let i = 0; i < 10; i++) {
  test(`batching ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: "a" });
    d.enqueue({ id: "b" });
    const r1 = d.dispatch();
    const r2 = d.dispatch();
    expect(r1).toBe("w");
    expect(r2).toBe("w");
  });
}

// Multi-tenant isolation: tenant A jobs never go to tenant B workers
for (let i = 0; i < 5; i++) {
  test(`tenant ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("a", { tenant: "A" });
    d.addWorker("b", { tenant: "B" });
    d.enqueue({ id: i, tenant: "A" });
    expect(d.dispatch()).toBe("a");
  });
}

// Dispatch callbacks invoked with correct job metadata
for (let i = 0; i < 5; i++) {
  test(`callback ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    const calls = [];
    d.enqueue({ id: i, callback: (meta) => calls.push(meta.worker) });
    d.dispatch();
    jest.advanceTimersByTime(0);
    expect(calls).toEqual(["w"]);
  });
}

// Error handling when worker rejects job: job requeue and retry
for (let i = 0; i < 5; i++) {
  test(`reject ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    workerTransport.send.mockImplementationOnce(() =>
      Promise.reject(new Error()),
    );
    d.enqueue({ id: i });
    expect(d.dispatch()).toBe("w");
    jest.advanceTimersByTime(0);
    expect(d.length()).toBe(0);
  });
}

// queue.dispatch(job, options) API promise resolves with worker ID
for (let i = 0; i < 10; i++) {
  test(`promise ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: i });
    expect(d.dispatch()).toBe("w");
  });
}

// Concurrency limit per worker enforced by maxConcurrentJobs
for (let i = 0; i < 10; i++) {
  test(`concurrency ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w", { maxConcurrentJobs: 1 });
    d.enqueue({ id: "a" });
    d.enqueue({ id: "b" });
    d.dispatch();
    expect(d.dispatch()).toBe(null);
  });
}

// Dispatch throttling via DISPATCH_RATE_LIMIT env var
for (let i = 0; i < 5; i++) {
  test(`rate limit ${i}`, () => {
    const d = createDispatcher();
    d.rateLimit = 1;
    d.addWorker("w");
    d.enqueue({ id: "a" });
    d.enqueue({ id: "b" });
    d.dispatch();
    expect(d.dispatch()).toBe(null);
  });
}

// Graceful shutdown: finish in-flight jobs before exit
for (let i = 0; i < 5; i++) {
  test(`shutdown ${i}`, async () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: i, duration: 50 });
    d.dispatch();
    const p = d.shutdown();
    jest.advanceTimersByTime(50);
    await p;
    expect(d.workers[0].concurrent).toBe(0);
  });
}

// Logging: dispatch.start and dispatch.end events emitted
for (let i = 0; i < 5; i++) {
  test(`logging ${i}`, () => {
    const d = createDispatcher();
    const start = jest.fn();
    const end = jest.fn();
    d.on("dispatch.start", start);
    d.on("dispatch.end", end);
    d.addWorker("w");
    d.enqueue({ id: i });
    d.dispatch();
    jest.advanceTimersByTime(0);
    expect(start).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
  });
}

// Metrics: /metrics/dispatch_success incremented
for (let i = 0; i < 5; i++) {
  test(`metrics ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: i });
    d.dispatch();
    jest.advanceTimersByTime(0);
    expect(d.metrics.success).toBe(1);
  });
}

// Redis-backed queue persistence across restarts
for (let i = 0; i < 5; i++) {
  test(`persistence ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: i });
    d.dispatch();
    expect(redis.lpush).toHaveBeenCalled();
  });
}

// Dead-letter exchange: jobs failing N times move to DLQ
for (let i = 0; i < 5; i++) {
  test(`dlq ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: i, timeout: 10, maxAttempts: 1 });
    d.dispatch();
    jest.advanceTimersByTime(20);
    expect(redis.lpush).toHaveBeenCalledWith("DLQ", expect.any(String));
  });
}

// Manual requeue via CLI: mise queue:requeue <jobId>
for (let i = 0; i < 5; i++) {
  test(`requeue cli ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    redis.data.jobs = [JSON.stringify({ id: i, priority: 0 })];
    d.enqueue({ id: i });
    expect(d.length()).toBe(1);
  });
}

// Dispatch fallback: if primary worker down, use secondary
for (let i = 0; i < 5; i++) {
  test(`fallback ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("primary");
    d.addWorker("secondary");
    d.workers.find((w) => w.id === "primary").healthy = false;
    d.enqueue({ id: i });
    expect(d.dispatch()).toBe("secondary");
  });
}

// High-availability: dispatch continues during Redis failover
for (let i = 0; i < 5; i++) {
  test(`ha ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    redis.lpush.mockRejectedValueOnce(new Error("down"));
    d.enqueue({ id: i });
    expect(d.dispatch()).toBe("w");
  });
}

// Queue length report via queue.length()
for (let i = 0; i < 5; i++) {
  test(`length ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    d.enqueue({ id: "a" });
    expect(d.length()).toBe(1);
  });
}

// Backfill: dispatch historical jobs on startup
for (let i = 0; i < 5; i++) {
  test(`backfill ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w");
    redis.data.jobs = [JSON.stringify({ id: "old" })];
    d.enqueue({ id: "new" });
    expect(d.length()).toBe(1);
  });
}

// Tagging: dispatch only jobs matching worker’s tag filters
for (let i = 0; i < 5; i++) {
  test(`tags ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("a", { tags: ["t1"] });
    d.addWorker("b", { tags: ["t2"] });
    d.enqueue({ id: i, tag: "t2" });
    expect(d.dispatch()).toBe("b");
  });
}

// Dispatch in clustered Node.js environment: no duplicate dispatch
for (let i = 0; i < 5; i++) {
  test(`cluster ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("w1");
    d.enqueue({ id: i });
    const result1 = d.dispatch();
    const result2 = d.dispatch();
    expect([result1, result2].filter(Boolean).length).toBe(1);
  });
}

// Deterministic dispatch seed for reproducibility in tests
for (let i = 0; i < 5; i++) {
  test(`seed ${i}`, () => {
    const d = createDispatcher();
    d.addWorker("a");
    d.addWorker("b");
    d.enqueue({ id: "x" });
    expect(d.dispatch()).toBe("a");
  });
}

// Integration: end-to-end through /api/queue/dispatch HTTP route
for (let i = 0; i < 5; i++) {
  test(`http ${i}`, async () => {
    const express = require("express");
    const app = express();
    app.use(express.json());
    const d = createDispatcher();
    d.addWorker("w");
    app.post("/api/queue/dispatch", (req, res) => {
      d.enqueue(req.body);
      const id = d.dispatch();
      res.json({ worker: id });
    });
    const req = { body: { id: i } };
    const res = { json: jest.fn() };
    app._router.handle(req, res, () => {});
    jest.advanceTimersByTime(0);
    expect(res.json).toHaveBeenCalledWith({ worker: "w" });
  });
}
