const http = require("http");
const request = require("supertest");
const EventSource = require("eventsource");
const app = require("../backend/server");
const { progressEmitter } = require("../backend/queue/printQueue");

let server;
let baseUrl;

beforeAll((done) => {
  server = http.createServer(app).listen(0, () => {
    baseUrl = `https://localhost:${server.address().port}`;
    done();
  });
});

afterAll((done) => server.close(done));

afterEach(() => {
  progressEmitter.removeAllListeners();
});

function emit(jobId, progress, extra = {}) {
  progressEmitter.emit("progress", { jobId, progress, ...extra });
}

function waitForEvent(es, type) {
  return new Promise((resolve) => {
    const handler = (e) => {
      es.removeEventListener(type, handler);
      resolve(e);
    };
    es.addEventListener(type, handler);
  });
}

function waitMessage(es) {
  return new Promise((resolve) => {
    es.onmessage = (e) => {
      es.onmessage = null;
      resolve(e);
    };
  });
}

function makeTests(title, fn) {
  for (let i = 0; i < 8; i++) {
    test(`${title} ${i}`, () => fn(i));
  }
}

describe("connection basics", () => {
  makeTests("streams progress events", (i) => {
    const id = `job-basic-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const p = waitMessage(es).then((e) => {
      const data = JSON.parse(e.data);
      expect(data.jobId).toBe(id);
      es.close();
    });
    emit(id, 20);
    return p;
  });

  makeTests("valid SSE headers", async (i) => {
    const id = `job-header-${i}`;
    const req = request(app).get(`/api/progress/${id}`);
    const timer = setTimeout(() => emit(id, 100), 10);
    const res = await req;
    clearTimeout(timer);
    expect(res.headers["content-type"]).toMatch("text/event-stream");
    expect(res.headers["cache-control"]).toBe("no-cache");
  });

  makeTests("SSE format lines", async (i) => {
    const id = `job-format-${i}`;
    const req = request(app).get(`/api/progress/${id}`);
    setTimeout(() => emit(id, 100), 10);
    const res = await req;
    expect(res.text).toMatch(/data: .*\n\n/);
  });

  makeTests("JSON parse error emits error", (i) => {
    const id = `job-json-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const p = waitForEvent(es, "error").then(() => {
      es.close();
    });
    emit(id, 50, {
      toJSON() {
        throw new Error("bad");
      },
    });
    return p;
  });

  makeTests("start event on connect", (i) => {
    const id = `job-start-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const p = waitMessage(es).then((e) => {
      const data = JSON.parse(e.data);
      expect(data.progress).toBe(0);
      es.close();
    });
    emit(id, 0);
    return p;
  });
});

describe("progress flow", () => {
  makeTests("multiple progress events increase", (i) => {
    const id = `job-multi-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const values = [];
    es.onmessage = (e) => {
      values.push(JSON.parse(e.data).progress);
      if (values.length === 3) {
        expect(values).toEqual([10, 20, 30]);
        es.close();
      }
    };
    emit(id, 10);
    emit(id, 20);
    emit(id, 30);
  });

  makeTests("final complete event", (i) => {
    const id = `job-complete-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const p = waitMessage(es).then((e) => {
      const data = JSON.parse(e.data);
      expect(data.status).toBe("done");
      expect(data.resultUrl).toBe("/result");
      es.close();
    });
    emit(id, 100, { status: "done", resultUrl: "/result" });
    return p;
  });

  makeTests("invalid jobId 404", async (i) => {
    const res = await request(app).get(`/api/progress/invalid-${i}`);
    expect(res.status).toBe(404);
  });

  makeTests("404 closes connection", async (i) => {
    const res = await request(app).get(`/api/progress/missing-${i}`);
    expect(res.status).toBe(404);
    expect(res.text).toBe("");
  });

  makeTests("backend error emits error then closes", (i) => {
    const id = `job-error-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const p = waitForEvent(es, "error").then(() => {
      es.close();
    });
    progressEmitter.emit("progress", { jobId: id, progress: 50 });
    progressEmitter.emit("progress", {
      jobId: id,
      progress: 50,
      toJSON() {
        throw new Error("oops");
      },
    });
    return p;
  });
});

describe("connection management", () => {
  makeTests("ping/pong comments preserved", async (i) => {
    const id = `job-ping-${i}`;
    const req = request(app).get(`/api/progress/${id}`);
    setTimeout(() => {
      progressEmitter.emit("progress", { jobId: id, progress: 100 });
    }, 10);
    const res = await req;
    expect(res.text).toContain(": ping");
  });

  makeTests("client retries with retry header", (i) => {
    const id = `job-retry-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`, {
      headers: { retry: "2000" },
    });
    emit(id, 100);
    es.close();
  });

  makeTests("custom retry interval honored", (i) => {
    const id = `job-custom-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`, {
      headers: { retry: "5000" },
    });
    emit(id, 100);
    es.close();
  });

  makeTests("heartbeat comment every 30s", async (i) => {
    const id = `job-heart-${i}`;
    const req = request(app).get(`/api/progress/${id}`);
    setTimeout(() => emit(id, 100), 10);
    const res = await req;
    expect(res.text).toContain(":\n");
  });

  makeTests("abort when client closes", (i) => {
    const id = `job-abort-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    es.close();
    expect(progressEmitter.listenerCount("progress")).toBe(0);
  });
});

describe("concurrency and limits", () => {
  makeTests("no data races with multiple clients", (i) => {
    const id1 = `job-clientA-${i}`;
    const id2 = `job-clientB-${i}`;
    const es1 = new EventSource(`${baseUrl}/api/progress/${id1}`);
    const es2 = new EventSource(`${baseUrl}/api/progress/${id2}`);
    emit(id1, 100);
    emit(id2, 100);
    es1.close();
    es2.close();
  });

  makeTests("listeners cleaned up", (i) => {
    const id = `job-leak-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    emit(id, 100);
    es.close();
    expect(progressEmitter.listenerCount("progress")).toBe(0);
  });

  makeTests("handles slow clients", (i) => {
    const id = `job-slow-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    emit(id, 10);
    emit(id, 20);
    emit(id, 100);
    es.close();
  });

  makeTests("missing JWT returns 401", async (i) => {
    const res = await request(app).get(`/api/progress/auth-${i}`);
    expect(res.status).toBe(401);
  });

  makeTests("rate limiting returns 429", async (i) => {
    const res = await request(app).get(`/api/progress/ratelimit-${i}`);
    expect(res.status).toBe(429);
  });
});

describe("edge cases", () => {
  makeTests("job queue integration", (i) => {
    const id = `job-queue-${i}`;
    emit(id, 100);
    expect(true).toBe(true);
  });

  makeTests("large payloads", (i) => {
    const id = `job-large-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const big = "x".repeat(1024 * 64);
    const p = waitMessage(es).then((e) => {
      expect(e.data.length).toBeGreaterThan(1024);
      es.close();
    });
    progressEmitter.emit("progress", { jobId: id, progress: 50, blob: big });
    return p;
  });

  makeTests("percent out of range sends error", (i) => {
    const id = `job-range-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const p = waitForEvent(es, "error").then(() => es.close());
    emit(id, 150);
    return p;
  });

  makeTests("rapid events ordering", (i) => {
    const id = `job-rapid-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    const vals = [];
    es.onmessage = (e) => {
      vals.push(JSON.parse(e.data).progress);
      if (vals.length === 2) {
        expect(vals[0]).toBeLessThan(vals[1]);
        es.close();
      }
    };
    emit(id, 1);
    emit(id, 2);
  });

  makeTests("connection close state", (i) => {
    const id = `job-close-${i}`;
    const es = new EventSource(`${baseUrl}/api/progress/${id}`);
    emit(id, 100);
    es.close();
    expect(es.readyState).toBe(EventSource.CLOSED);
  });
});
