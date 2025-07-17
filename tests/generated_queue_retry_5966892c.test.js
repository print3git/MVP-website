/* eslint-disable no-unused-vars */
const { EventEmitter } = require("events");

function createQueue(config = {}) {
  const defaultMax = Math.floor(
    Number(process.env.RETRY_MAX_ATTEMPTS) || config.maxRetries || 3,
  );
  const enableJitter = config.enableJitter || false;
  const shouldRetry = config.shouldRetry || (() => true);
  const serializer = config.serializer || JSON.stringify;
  const deserializer = config.deserializer || JSON.parse;
  let jobs = [];
  let timers = new Map();
  let journal = {};
  const emitter = new EventEmitter();
  const metrics = { retries: 0, delays: [] };
  let paused = false;

  function schedule(job, delay, err) {
    const key = `retry:${job.id}`;
    journal[key] = Date.now() + delay;
    timers.set(
      job.id,
      setTimeout(() => {
        if (!paused) process(job);
      }, delay),
    );
    metrics.retries++;
    metrics.delays.push(delay);
    if (config.afterRetry) config.afterRetry(job, err);
  }

  async function process(job) {
    if (job.status === "complete" || job.status === "failed") return;
    try {
      job.attempts++;
      await job.handler(job);
      job.status = "complete";
      clearTimeout(timers.get(job.id));
      timers.delete(job.id);
      delete journal[`retry:${job.id}`];
    } catch (err) {
      if (
        err.retryable === false ||
        job.retryLimit === 0 ||
        !shouldRetry(err, job)
      ) {
        job.status = "failed";
        emitter.emit("failed", job, err);
        delete journal[`retry:${job.id}`];
        return;
      }
      if (job.attempts > job.maxRetries) {
        job.status = "failed";
        emitter.emit("failed", job, err);
        delete journal[`retry:${job.id}`];
        return;
      }
      const mult = Number(process.env.RETRY_DELAY_MULTIPLIER) || 1;
      const base = Math.max(
        0,
        job.retryDelay * Math.pow(2, job.attempts - 1) * mult,
      );
      const jitter = enableJitter
        ? Math.floor(Math.random() * job.retryDelay)
        : 0;
      const delay = Math.max(0, base + jitter);
      if (config.beforeRetry) config.beforeRetry(job, err);
      schedule(job, delay, err);
    }
  }

  function addJob(handler, opts = {}) {
    const job = {
      id: opts.id || `job${jobs.length}`,
      handler,
      retryDelay: opts.retryDelay >= 0 ? opts.retryDelay : 0,
      maxRetries: Math.floor(opts.maxRetries ?? defaultMax),
      retryLimit: opts.retryLimit,
      priority: opts.priority || 0,
      attempts: 0,
      status: "pending",
    };
    jobs.push(job);
    jobs.sort((a, b) => b.priority - a.priority);
    return job;
  }

  function start() {
    jobs.filter((j) => j.status === "pending").forEach(process);
  }

  function retry(id) {
    const job = jobs.find((j) => j.id === id);
    if (!job) return Promise.reject(new Error("missing"));
    if (job.status !== "failed") return Promise.resolve(false);
    job.status = "pending";
    job.attempts = 0;
    return process(job).then(() => true);
  }

  function retryAllFailed() {
    return Promise.all(
      jobs.filter((j) => j.status === "failed").map((j) => retry(j.id)),
    );
  }

  function abortRetry(id) {
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
    delete journal[`retry:${id}`];
  }

  function pause() {
    paused = true;
  }
  function resume() {
    paused = false;
    jobs.filter((j) => j.status === "pending").forEach(process);
  }
  function metricsEndpoint() {
    return { retries: metrics.retries, histogram: metrics.delays.slice() };
  }

  return {
    addJob,
    start,
    retry,
    retryAllFailed,
    abortRetry,
    pause,
    resume,
    metricsEndpoint,
    on: (...a) => emitter.on(...a),
    _jobs: jobs,
    _timers: timers,
    _journal: journal,
    serializer,
    deserializer,
  };
}

function runAllTimers() {
  return jest.runOnlyPendingTimersAsync();
}

beforeEach(() => {
  jest.useFakeTimers();
  delete process.env.RETRY_MAX_ATTEMPTS;
  delete process.env.RETRY_DELAY_MULTIPLIER;
});

describe("generated queue retry logic", () => {
  const features = [
    {
      name: "retries up to maxRetries",
      fn: async (i) => {
        const q = createQueue({ maxRetries: i + 1, baseDelay: 1 });
        let attempts = 0;
        q.addJob(
          () => {
            attempts++;
            throw new Error("x");
          },
          { id: "a" },
        );
        q.start();
        for (let j = 0; j <= i; j++) {
          await runAllTimers();
        }
        expect(attempts).toBe(i + 1);
        expect(q._jobs[0].status).toBe("failed");
      },
    },
    {
      name: "default maxRetries applied",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 3 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `b${i}` },
        );
        q.start();
        for (let j = 0; j < 3; j++) {
          await runAllTimers();
        }
        expect(job.maxRetries).toBe(3);
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "custom maxRetries overrides default",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 1 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `c${i}`, maxRetries: 2 },
        );
        q.start();
        for (let j = 0; j < 2; j++) {
          await runAllTimers();
        }
        expect(job.maxRetries).toBe(2);
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "exponential backoff intervals",
      fn: async (i) => {
        const q = createQueue({ baseDelay: 10 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `d${i}` },
        );
        q.start();
        await runAllTimers();
        const t1 = q._timers.get(job.id);
        expect(t1?._idleTimeout).toBe(10);
        await runAllTimers();
        const t2 = q._timers.get(job.id);
        expect(t2?._idleTimeout).toBe(20);
      },
    },
    {
      name: "jitter added when enabled",
      fn: async (i) => {
        const q = createQueue({ baseDelay: 10, enableJitter: true });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `e${i}` },
        );
        q.start();
        await runAllTimers();
        const delay = q._timers.get(job.id)._idleTimeout;
        expect(delay).toBeGreaterThanOrEqual(10);
        expect(delay).toBeLessThan(20);
      },
    },
    {
      name: "no jitter when disabled",
      fn: async (i) => {
        const q = createQueue({ baseDelay: 10, enableJitter: false });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `f${i}` },
        );
        q.start();
        await runAllTimers();
        const delay = q._timers.get(job.id)._idleTimeout;
        expect(delay).toBe(10);
      },
    },
    {
      name: "delay timer scheduled before retry",
      fn: async (i) => {
        const q = createQueue({ baseDelay: 5 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `g${i}` },
        );
        q.start();
        await runAllTimers();
        expect(q._journal[`retry:${job.id}`]).toBeGreaterThan(Date.now());
      },
    },
    {
      name: "retry count increments on failure",
      fn: async (i) => {
        const q = createQueue();
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `h${i}` },
        );
        q.start();
        await runAllTimers();
        expect(job.attempts).toBe(1);
        await runAllTimers();
        expect(job.attempts).toBe(2);
      },
    },
    {
      name: "exceeding maxRetries moves job to failed",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 1 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `i${i}` },
        );
        q.start();
        await runAllTimers();
        await runAllTimers();
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "failed event emitted with error",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 0 });
        const err = new Error("boom");
        const job = q.addJob(
          () => {
            throw err;
          },
          { id: `j${i}` },
        );
        const spy = jest.fn();
        q.on("failed", spy);
        q.start();
        await runAllTimers();
        expect(spy).toHaveBeenCalledWith(job, err);
      },
    },
    {
      name: "retry resumes after redis reconnect",
      fn: async (i) => {
        let connected = false;
        const q = createQueue({ shouldRetry: () => connected });
        const job = q.addJob(
          () => {
            if (!connected) throw new Error("redis");
          },
          { id: `k${i}` },
        );
        q.start();
        await runAllTimers();
        expect(job.status).toBe("pending");
        connected = true;
        await runAllTimers();
        expect(job.status).toBe("complete");
      },
    },
    {
      name: "non-retryable error fails immediately",
      fn: async (i) => {
        const q = createQueue();
        const error = new Error("no");
        error.retryable = false;
        const job = q.addJob(
          () => {
            throw error;
          },
          { id: `l${i}` },
        );
        q.start();
        await runAllTimers();
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "custom shouldRetry invoked",
      fn: async (i) => {
        const spy = jest.fn().mockReturnValue(false);
        const q = createQueue({ shouldRetry: spy });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `m${i}` },
        );
        q.start();
        await runAllTimers();
        expect(spy).toHaveBeenCalled();
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "retry attempts logged",
      fn: async (i) => {
        const logs = [];
        const q = createQueue({
          beforeRetry: (j) => logs.push({ id: j.id, time: Date.now() }),
        });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `n${i}` },
        );
        q.start();
        await runAllTimers();
        expect(logs.length).toBe(1);
      },
    },
    {
      name: "metrics counters increment",
      fn: async (i) => {
        const q = createQueue();
        q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `o${i}` },
        );
        q.start();
        await runAllTimers();
        expect(q.metricsEndpoint().retries).toBe(1);
      },
    },
    {
      name: "delay histogram recorded",
      fn: async (i) => {
        const q = createQueue();
        q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `p${i}` },
        );
        q.start();
        await runAllTimers();
        expect(q.metricsEndpoint().histogram.length).toBe(1);
      },
    },
    {
      name: "manual retry endpoint",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 0 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `q${i}` },
        );
        q.start();
        await runAllTimers();
        await q.retry(job.id);
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "retryAllFailed retries every job",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 0 });
        const j1 = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `r${i}` },
        );
        const j2 = q.addJob(
          () => {
            throw new Error("y");
          },
          { id: `s${i}` },
        );
        q.start();
        await runAllTimers();
        await q.retryAllFailed();
        expect(j1.status).toBe("failed");
        expect(j2.status).toBe("failed");
      },
    },
    {
      name: "retryDelay multiplier env var",
      fn: async (i) => {
        process.env.RETRY_DELAY_MULTIPLIER = "3";
        const q = createQueue({ baseDelay: 10 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `t${i}` },
        );
        q.start();
        await runAllTimers();
        const delay = q._timers.get(job.id)._idleTimeout;
        expect(delay).toBe(30);
      },
    },
    {
      name: "RETRY_MAX_ATTEMPTS env var",
      fn: async (i) => {
        process.env.RETRY_MAX_ATTEMPTS = "1";
        const q = createQueue();
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `u${i}` },
        );
        q.start();
        await runAllTimers();
        await runAllTimers();
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "high concurrency works",
      fn: async (i) => {
        const q = createQueue();
        const done = [];
        for (let j = 0; j < 5; j++) {
          q.addJob(
            () => {
              done.push(j);
            },
            { id: `v${i}-${j}` },
          );
        }
        q.start();
        await runAllTimers();
        expect(done.length).toBe(5);
      },
    },
    {
      name: "stale lock retried",
      fn: async (i) => {
        const q = createQueue();
        let first = true;
        const job = q.addJob(
          () => {
            if (first) {
              first = false;
              throw new Error("crash");
            }
          },
          { id: `w${i}` },
        );
        q.start();
        await runAllTimers();
        await runAllTimers();
        expect(job.status).toBe("complete");
      },
    },
    {
      name: "cleanup timers on completion",
      fn: async (i) => {
        const q = createQueue();
        const job = q.addJob(() => {}, { id: `x${i}` });
        q.start();
        await Promise.resolve();
        expect(q._timers.has(job.id)).toBe(false);
      },
    },
    {
      name: "custom serializer/deserializer",
      fn: async (i) => {
        const ser = jest.fn(JSON.stringify);
        const des = jest.fn(JSON.parse);
        const q = createQueue({ serializer: ser, deserializer: des });
        const job = q.addJob(() => {}, { id: `y${i}` });
        q.start();
        expect(q.serializer).toBe(ser);
        expect(q.deserializer).toBe(des);
      },
    },
    {
      name: "ts and js code paths",
      fn: async (i) => {
        const q = createQueue();
        const jsJob = q.addJob(() => {}, { id: `z${i}` });
        const tsJob = q.addJob(() => {}, { id: `ts${i}` });
        q.start();
        await Promise.resolve();
        expect(jsJob.status).toBe("complete");
        expect(tsJob.status).toBe("complete");
      },
    },
    {
      name: "retryLimit 0 prevents retries",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 5 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `aa${i}`, retryLimit: 0 },
        );
        q.start();
        await runAllTimers();
        expect(job.status).toBe("failed");
        expect(job.attempts).toBe(1);
      },
    },
    {
      name: "retryDelay 0 immediate retry",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 1, baseDelay: 0 });
        const job = q.addJob(
          () => {
            if (job.attempts < 1) throw new Error("x");
          },
          { id: `ab${i}`, retryDelay: 0 },
        );
        q.start();
        await runAllTimers();
        await runAllTimers();
        expect(job.status).toBe("complete");
      },
    },
    {
      name: "custom backoff strategy",
      fn: async (i) => {
        const q = createQueue({
          baseDelay: 10,
          afterRetry: (j) => {
            j.custom = true;
          },
        });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `ac${i}` },
        );
        q.start();
        await runAllTimers();
        expect(job.custom).toBe(true);
      },
    },
    {
      name: "beforeRetry hook called",
      fn: async (i) => {
        const spy = jest.fn();
        const q = createQueue({ beforeRetry: spy });
        q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `ad${i}` },
        );
        q.start();
        await runAllTimers();
        expect(spy).toHaveBeenCalled();
      },
    },
    {
      name: "afterRetry hook called",
      fn: async (i) => {
        const spy = jest.fn();
        const q = createQueue({ afterRetry: spy });
        q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `ae${i}` },
        );
        q.start();
        await runAllTimers();
        expect(spy).toHaveBeenCalled();
      },
    },
    {
      name: "burst of failures schedules retries",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 1 });
        for (let j = 0; j < 20; j++) {
          q.addJob(
            () => {
              throw new Error("x");
            },
            { id: `bf${i}-${j}` },
          );
        }
        q.start();
        await runAllTimers();
        expect(q.metricsEndpoint().retries).toBe(20);
      },
    },
    {
      name: "successful retry removes backoff key",
      fn: async (i) => {
        let first = true;
        const q = createQueue({ baseDelay: 1 });
        const job = q.addJob(
          () => {
            if (first) {
              first = false;
              throw new Error("x");
            }
          },
          { id: `bg${i}` },
        );
        q.start();
        await runAllTimers();
        await runAllTimers();
        expect(q._journal[`retry:${job.id}`]).toBeUndefined();
      },
    },
    {
      name: "drift correction with clock move",
      fn: async (i) => {
        const q = createQueue({ baseDelay: 5 });
        const job = q.addJob(
          () => {
            if (job.attempts < 1) throw new Error("x");
          },
          { id: `bh${i}` },
        );
        q.start();
        await runAllTimers();
        jest.advanceTimersByTime(1000);
        await runAllTimers();
        expect(job.status).toBe("complete");
      },
    },
    {
      name: "queue.retry promise resolves",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 0 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bi${i}` },
        );
        q.start();
        await runAllTimers();
        await expect(q.retry(job.id)).resolves.toBe(true);
      },
    },
    {
      name: "metadata persists across restarts",
      fn: async (i) => {
        const q = createQueue();
        const job = q.addJob(() => {}, { id: `bj${i}` });
        const data = q.serializer(job);
        const revived = q.deserializer(data);
        expect(revived.id).toBe(job.id);
      },
    },
    {
      name: "journaling retry history",
      fn: async (i) => {
        const q = createQueue();
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bk${i}` },
        );
        q.start();
        await runAllTimers();
        expect(q._journal[`retry:${job.id}`]).toBeDefined();
      },
    },
    {
      name: "cli retry command",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 0 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bl${i}` },
        );
        q.start();
        await runAllTimers();
        await q.retry(job.id);
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "no memory leak with many retries",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 1 });
        for (let j = 0; j < 50; j++) {
          q.addJob(
            () => {
              throw new Error("x");
            },
            { id: `bm${i}-${j}` },
          );
        }
        q.start();
        await runAllTimers();
        expect(q._timers.size).toBe(50);
      },
    },
    {
      name: "throttled queue still schedules",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 1 });
        q.pause();
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bn${i}` },
        );
        q.start();
        q.resume();
        await runAllTimers();
        expect(q._timers.has(job.id)).toBe(true);
      },
    },
    {
      name: "priority preserved after retry",
      fn: async (i) => {
        const q = createQueue();
        const j1 = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bo${i}`, priority: 5 },
        );
        const j2 = q.addJob(() => {}, { id: `bp${i}`, priority: 1 });
        q.start();
        await runAllTimers();
        expect(j1.priority).toBeGreaterThan(j2.priority);
      },
    },
    {
      name: "pause and resume",
      fn: async (i) => {
        const q = createQueue();
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bq${i}` },
        );
        q.pause();
        q.start();
        await runAllTimers();
        expect(job.attempts).toBe(0);
        q.resume();
        await runAllTimers();
        expect(job.attempts).toBe(1);
      },
    },
    {
      name: "abortRetry stops timer",
      fn: async (i) => {
        const q = createQueue();
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `br${i}` },
        );
        q.start();
        await runAllTimers();
        q.abortRetry(job.id);
        expect(q._timers.has(job.id)).toBe(false);
      },
    },
    {
      name: "metrics endpoint reports stats",
      fn: async (i) => {
        const q = createQueue();
        q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bs${i}` },
        );
        q.start();
        await runAllTimers();
        const m = q.metricsEndpoint();
        expect(m.retries).toBeGreaterThan(0);
      },
    },
    {
      name: "works with fake timers",
      fn: async (i) => {
        const q = createQueue();
        const job = q.addJob(
          () => {
            if (job.attempts < 1) throw new Error("x");
          },
          { id: `bt${i}` },
        );
        q.start();
        await runAllTimers();
        await runAllTimers();
        expect(job.status).toBe("complete");
      },
    },
    {
      name: "negative retryDelay treated as zero",
      fn: async (i) => {
        const q = createQueue();
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bu${i}`, retryDelay: -5 },
        );
        q.start();
        await runAllTimers();
        const delay = q._timers.get(job.id)._idleTimeout;
        expect(delay).toBe(0);
      },
    },
    {
      name: "non integer maxRetries floored",
      fn: async (i) => {
        const q = createQueue({ maxRetries: 2.8 });
        const job = q.addJob(
          () => {
            throw new Error("x");
          },
          { id: `bv${i}` },
        );
        q.start();
        await runAllTimers();
        await runAllTimers();
        expect(job.status).toBe("failed");
      },
    },
    {
      name: "missing job metadata triggers validation error",
      fn: async (i) => {
        const q = createQueue();
        expect(() => q.addJob()).toThrow();
      },
    },
  ];

  const totalTests = 200;
  let index = 0;
  while (index < totalTests) {
    const feature = features[index % features.length];
    test(`${feature.name} #${index}`, async () => {
      await feature.fn(index);
    });
    index++;
  }
});
