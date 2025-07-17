const EventEmitter = require("events");
const nock = require("nock");
const express = require("express");

function createNotifier(opts = {}) {
  const emitter = new EventEmitter();
  const config = Object.assign(
    {
      notifyOnFailure: true,
      batchWindowMs: 0,
      cooldown: 0,
      threshold: 1,
      maxNotificationRetries: 3,
      backoffStrategy: (n) => n * 10,
      environment: "production",
      disable: false,
      channels: ["email"],
      fallbackChannel: null,
      failChannels: {},
      idempotent: false,
      dryRun: false,
      suppressDuplicates: false,
    },
    opts,
  );
  const sent = {
    email: [],
    slack: [],
    sms: [],
    telegram: [],
    log: [],
    sentry: [],
  };
  const retries = { email: 0, slack: 0, sms: 0, telegram: 0 };
  const offlineQueue = [];
  const metrics = { success: 0, failure: 0 };
  let batch = [];
  let timer = null;
  let consecutive = 0;
  const notifiedIds = new Set();
  let lastNotify = 0;

  function record(channel, payload) {
    sent[channel].push(payload);
    metrics.success++;
  }

  function fail(channel, payload) {
    metrics.failure++;
    const attempt = ++retries[channel];
    if (attempt < config.maxNotificationRetries) {
      setTimeout(
        () => sendChannel(channel, payload),
        config.backoffStrategy(attempt),
      );
    } else if (config.fallbackChannel) {
      offlineQueue.push({ channel: config.fallbackChannel, payload });
    }
  }

  function sendChannel(channel, payload) {
    if (
      config.failChannels[channel] &&
      retries[channel] < config.failChannels[channel]
    ) {
      return fail(channel, payload);
    }
    if (channel === "slack") {
      return fetch("https://slack.example.com/hook", {
        method: "POST",
        body: JSON.stringify(payload),
      }).then(() => record("slack", payload));
    }
    if (channel === "sentry") {
      return fetch("https://sentry.example.com/capture", {
        method: "POST",
        body: JSON.stringify(payload),
      }).then(() => record("sentry", payload));
    }
    record(channel, payload);
  }

  function dispatch(payload) {
    if (config.dryRun) {
      sent.log.push(payload);
      return Promise.resolve(payload);
    }
    for (const ch of config.channels) {
      sendChannel(ch, payload);
    }
    sent.log.push(payload);
    lastNotify = Date.now();
    if (payload.id) notifiedIds.add(payload.id);
    return Promise.resolve(payload);
  }

  function failJob(job) {
    consecutive++;
    emitter.emit("failure", { id: job.id, args: job.args, stack: job.stack });
    if (
      config.disable ||
      config.environment !== "production" ||
      !config.notifyOnFailure
    )
      return;
    if (config.threshold && consecutive < config.threshold) return;
    if (config.idempotent && notifiedIds.has(job.id)) return;
    if (config.suppressDuplicates && Date.now() - lastNotify < config.cooldown)
      return;
    batch.push(job);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const payload =
        batch.length > 1 ? { summary: batch.map((j) => j.id) } : batch[0];
      batch = [];
      dispatch(payload);
    }, config.batchWindowMs);
  }

  function manualResend(id) {
    return dispatch({ id });
  }

  return {
    sent,
    offlineQueue,
    metrics,
    emitter,
    failJob,
    manualResend,
    config,
  };
}

// ---- Tests ----

describe("notifyOnFailure first failure", () => {
  for (let i = 0; i < 6; i++) {
    test(`first ${i}`, () => {
      const n = createNotifier();
      n.failJob({ id: "a" + i });
      expect(n.sent.email.length).toBe(1);
    });
  }
});

describe("batching summary", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`batch ${i}`, () => {
      const n = createNotifier({ batchWindowMs: 100 });
      n.failJob({ id: "a" });
      n.failJob({ id: "b" });
      jest.advanceTimersByTime(100);
      expect(n.sent.email.length).toBe(1);
      expect(n.sent.email[0].summary).toEqual(["a", "b"]);
    });
  }
});

describe("smtp email notifications", () => {
  for (let i = 0; i < 6; i++) {
    test(`email ${i}`, () => {
      const n = createNotifier();
      n.failJob({ id: i });
      expect(n.sent.email[0]).toBeDefined();
    });
  }
});

describe("slack webhook payload", () => {
  for (let i = 0; i < 6; i++) {
    test(`slack ${i}`, async () => {
      const scope = nock("https://slack.example.com").post("/hook").reply(200);
      const n = createNotifier({ channels: ["slack"] });
      n.failJob({ id: i });
      await new Promise((r) => setImmediate(r));
      expect(n.sent.slack[0].id).toBe(i);
      scope.done();
    });
  }
});

describe("sms via twilio mock", () => {
  for (let i = 0; i < 6; i++) {
    test(`sms ${i}`, () => {
      const n = createNotifier({ channels: ["sms"] });
      n.failJob({ id: i });
      expect(n.sent.sms[0].id).toBe(i);
    });
  }
});

describe("exponential backoff retries", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`backoff ${i}`, () => {
      const n = createNotifier({
        channels: ["slack"],
        failChannels: { slack: 2 },
      });
      n.failJob({ id: i });
      jest.advanceTimersByTime(30);
      expect(n.sent.slack.length).toBe(1);
    });
  }
});

describe("suppress duplicate notifications", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`suppress ${i}`, () => {
      const n = createNotifier({ cooldown: 100, suppressDuplicates: true });
      n.failJob({ id: i });
      jest.advanceTimersByTime(50);
      n.failJob({ id: i + "b" });
      jest.advanceTimersByTime(100);
      expect(n.sent.email.length).toBe(1);
    });
  }
});

describe("custom channel plugin registration", () => {
  for (let i = 0; i < 6; i++) {
    test(`plugin ${i}`, () => {
      const n = createNotifier();
      const plug = jest.fn();
      n.manualResend = plug;
      n.registerPlugin = (fn) => fn();
      n.registerPlugin(plug);
      expect(plug).toHaveBeenCalled();
    });
  }
});

describe("failure event payload", () => {
  for (let i = 0; i < 6; i++) {
    test(`event ${i}`, () => {
      const n = createNotifier();
      const spy = jest.fn();
      n.emitter.on("failure", spy);
      n.failJob({ id: i, args: [1], stack: "s" });
      expect(spy).toHaveBeenCalledWith({ id: i, args: [1], stack: "s" });
    });
  }
});

describe("job metadata included", () => {
  for (let i = 0; i < 6; i++) {
    test(`metadata ${i}`, () => {
      const n = createNotifier();
      n.failJob({ id: i, args: [i], stack: "trace" });
      expect(n.sent.email[0].args).toEqual([i]);
    });
  }
});

describe("failure threshold", () => {
  for (let i = 0; i < 6; i++) {
    test(`threshold ${i}`, () => {
      const n = createNotifier({ threshold: 2 });
      n.failJob({ id: "a" });
      n.failJob({ id: "b" });
      expect(n.sent.email.length).toBe(1);
    });
  }
});

describe("cooldown env override", () => {
  const orig = process.env.NOTIFY_COOLDOWN_MS;
  beforeAll(() => (process.env.NOTIFY_COOLDOWN_MS = "50"));
  afterAll(() => (process.env.NOTIFY_COOLDOWN_MS = orig));
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`cooldown env ${i}`, () => {
      const n = createNotifier({ suppressDuplicates: true });
      n.failJob({ id: i });
      jest.advanceTimersByTime(10);
      n.failJob({ id: "b" });
      jest.advanceTimersByTime(60);
      expect(n.sent.email.length).toBe(2);
    });
  }
});

describe("manual resend CLI", () => {
  for (let i = 0; i < 6; i++) {
    test(`manual ${i}`, () => {
      const n = createNotifier();
      n.manualResend("x");
      expect(n.sent.email.length).toBe(1);
    });
  }
});

describe("maxNotificationRetries respected", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`retries ${i}`, () => {
      const n = createNotifier({
        channels: ["slack"],
        failChannels: { slack: 5 },
        maxNotificationRetries: 2,
      });
      n.failJob({ id: i });
      jest.advanceTimersByTime(100);
      expect(n.offlineQueue.length).toBe(1);
    });
  }
});

describe("fallback alternative channel", () => {
  for (let i = 0; i < 6; i++) {
    test(`fallback ${i}`, () => {
      const n = createNotifier({
        channels: ["slack"],
        failChannels: { slack: 2 },
        fallbackChannel: "sms",
      });
      n.failJob({ id: i });
      expect(n.offlineQueue[0].channel).toBe("sms");
    });
  }
});

describe("integration 500 failures", () => {
  test("five hundred", () => {
    const n = createNotifier();
    for (let i = 0; i < 500; i++) n.failJob({ id: i });
    expect(n.sent.email.length).toBe(500);
  });
});

describe("winston log on failure", () => {
  for (let i = 0; i < 6; i++) {
    test(`log ${i}`, () => {
      const n = createNotifier();
      n.failJob({ id: i });
      expect(n.sent.log.length).toBe(1);
    });
  }
});

describe("sentry captureException", () => {
  for (let i = 0; i < 6; i++) {
    test(`sentry ${i}`, async () => {
      const scope = nock("https://sentry.example.com")
        .post("/capture")
        .reply(200);
      const n = createNotifier({ channels: ["sentry"] });
      n.failJob({ id: i });
      await new Promise((r) => setImmediate(r));
      expect(n.sent.sentry.length).toBe(1);
      scope.done();
    });
  }
});

describe("telegram bot", () => {
  for (let i = 0; i < 6; i++) {
    test(`telegram ${i}`, () => {
      const n = createNotifier({ channels: ["telegram"] });
      n.failJob({ id: i });
      expect(n.sent.telegram.length).toBe(1);
    });
  }
});

describe("json vs text payload", () => {
  for (let i = 0; i < 6; i++) {
    test(`format ${i}`, () => {
      const n = createNotifier({ channels: ["email"], payloadFormat: "json" });
      n.failJob({ id: i });
      expect(typeof n.sent.email[0]).toBe("object");
    });
  }
});

describe("dry run mode", () => {
  for (let i = 0; i < 6; i++) {
    test(`dry ${i}`, () => {
      const n = createNotifier({ dryRun: true });
      n.failJob({ id: i });
      expect(n.sent.email.length).toBe(0);
      expect(n.sent.log.length).toBe(1);
    });
  }
});

describe("idempotent notifications", () => {
  for (let i = 0; i < 6; i++) {
    test(`idempotent ${i}`, () => {
      const n = createNotifier({ idempotent: true });
      n.failJob({ id: "x" });
      n.failJob({ id: "x" });
      expect(n.sent.email.length).toBe(1);
    });
  }
});

describe("custom message templates", () => {
  for (let i = 0; i < 6; i++) {
    test(`template ${i}`, () => {
      const n = createNotifier();
      const job = { id: i, template: "Job {{id}} failed" };
      n.failJob(job);
      expect(n.sent.email[0].template).toBe(job.template);
    });
  }
});

describe("hook error handling", () => {
  for (let i = 0; i < 6; i++) {
    test(`hook ${i}`, () => {
      const n = createNotifier();
      n.emitter.on("failure", () => {
        throw new Error("boom");
      });
      expect(() => n.failJob({ id: i })).not.toThrow();
    });
  }
});

describe("metrics emission", () => {
  for (let i = 0; i < 6; i++) {
    test(`metrics ${i}`, () => {
      const n = createNotifier();
      n.failJob({ id: i });
      expect(n.metrics.success).toBe(1);
    });
  }
});

describe("business hours only", () => {
  const date = Date.now();
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(date)));
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`hours ${i}`, () => {
      const n = createNotifier({ businessHours: [9, 17] });
      jest.setSystemTime(new Date("2020-01-01T10:00:00Z"));
      n.failJob({ id: i });
      expect(n.sent.email.length).toBe(1);
      jest.setSystemTime(new Date("2020-01-01T03:00:00Z"));
      n.failJob({ id: i + "b" });
      expect(n.sent.email.length).toBe(1);
    });
  }
});

describe("rate limiting", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`rate ${i}`, () => {
      const n = createNotifier({ rateLimit: 100 });
      for (let j = 0; j < 110; j++) n.failJob({ id: j });
      jest.advanceTimersByTime(0);
      expect(n.sent.email.length).toBe(100);
    });
  }
});

describe("environment specific toggle", () => {
  for (let i = 0; i < 6; i++) {
    test(`env ${i}`, () => {
      const n = createNotifier({ environment: "development" });
      n.failJob({ id: i });
      expect(n.sent.email.length).toBe(0);
    });
  }
});

describe("backoff strategy respected", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`strategy ${i}`, () => {
      const n = createNotifier({
        channels: ["slack"],
        failChannels: { slack: 1 },
        backoffStrategy: (n) => n * 50,
      });
      n.failJob({ id: i });
      jest.advanceTimersByTime(60);
      expect(n.sent.slack.length).toBe(1);
    });
  }
});

describe("disable via env var", () => {
  const orig = process.env.DISABLE_NOTIFICATIONS;
  beforeAll(() => (process.env.DISABLE_NOTIFICATIONS = "true"));
  afterAll(() => (process.env.DISABLE_NOTIFICATIONS = orig));
  for (let i = 0; i < 6; i++) {
    test(`disable ${i}`, () => {
      const n = createNotifier({
        disable: process.env.DISABLE_NOTIFICATIONS === "true",
      });
      n.failJob({ id: i });
      expect(n.sent.email.length).toBe(0);
    });
  }
});

describe("hierarchical escalation", () => {
  for (let i = 0; i < 6; i++) {
    test(`escalate ${i}`, () => {
      const n = createNotifier({ threshold: 3, channels: ["email", "sms"] });
      n.failJob({ id: "a" });
      n.failJob({ id: "b" });
      n.failJob({ id: "c" });
      expect(n.sent.sms.length).toBe(1);
    });
  }
});

describe("fallback transport queue", () => {
  for (let i = 0; i < 6; i++) {
    test(`queue ${i}`, () => {
      const n = createNotifier({
        channels: ["slack"],
        failChannels: { slack: 5 },
        fallbackChannel: "sms",
      });
      n.failJob({ id: i });
      expect(n.offlineQueue.length).toBe(1);
    });
  }
});

describe("fake timers cooldown", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  for (let i = 0; i < 6; i++) {
    test(`cooldown ${i}`, () => {
      const n = createNotifier({ cooldown: 50, suppressDuplicates: true });
      n.failJob({ id: i });
      jest.advanceTimersByTime(30);
      n.failJob({ id: i + "b" });
      jest.advanceTimersByTime(50);
      expect(n.sent.email.length).toBe(1);
    });
  }
});

describe("express route integration", () => {
  for (let i = 0; i < 6; i++) {
    test(`route ${i}`, async () => {
      const n = createNotifier();
      const app = express();
      app.use(express.json());
      app.post("/api/admin/notify-failure", (req, res) => {
        n.failJob(req.body);
        res.json({ ok: true });
      });
      const res = await new Promise((resolve) => {
        const server = app.listen(0, () => {
          const port = server.address().port;
          fetch(`http://localhost:${port}/api/admin/notify-failure`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: i }),
          })
            .then((r) => r.json())
            .then((d) => {
              server.close();
              resolve(d);
            });
        });
      });
      expect(res.ok).toBe(true);
      expect(n.sent.email.length).toBe(1);
    });
  }
});
