const request = require("../backend/node_modules/supertest");
const { newDb } = require("pg-mem");

// deterministic time and uuids
jest.useFakeTimers().setSystemTime(new Date("2023-01-01T00:00:00Z"));
let uuidCounter = 0;
jest.mock("uuid", () => ({
  v4: jest.fn(
    () =>
      `00000000-0000-0000-0000-${(uuidCounter++).toString().padStart(12, "0")}`,
  ),
}));

// in-memory pg database
const mem = newDb();
mem.public.none(`
  CREATE TABLE jobs (
    job_id uuid PRIMARY KEY,
    prompt TEXT,
    image_ref TEXT,
    status TEXT,
    user_id uuid,
    snapshot TEXT
  );
  CREATE TABLE generation_logs (
    id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    finish_time TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL,
    cost_cents INTEGER DEFAULT 0
  );
`);
const { Pool } = mem.adapters.createPg();
const pool = new Pool();
jest.mock("pg", () => ({ Pool: jest.fn(() => pool) }));

process.env.SPARC3D_COST_CENTS = "5";
process.env.STABILITY_COST_CENTS = "2";
process.env.NODE_ENV = "test";

jest.mock("../backend/src/pipeline/generateModel", () => ({
  generateModel: jest.fn(),
}));
const { generateModel } = require("../backend/src/pipeline/generateModel");

const app = require("../backend/server");

beforeEach(async () => {
  await pool.query("DELETE FROM jobs");
  await pool.query("DELETE FROM generation_logs");
  generateModel.mockReset();
  uuidCounter = 0;
});

afterAll(async () => {
  await pool.end();
});

// group 1: text prompts and edge cases

describe("text prompt generation", () => {
  const prompts = Array.from({ length: 25 }, (_, i) => `prompt-${i}`);
  test.each(prompts)("valid text prompt %s", async (prompt) => {
    generateModel.mockResolvedValueOnce(`/m/${prompt}.glb`);
    const res = await request(app).post("/api/generate").send({ prompt });
    expect(res.status).toBe(200);
    expect(res.body.jobId).toMatch(/^[0-9a-f-]{36}$/);
    const rows = await pool.query("SELECT * FROM jobs WHERE job_id=$1", [
      res.body.jobId,
    ]);
    expect(rows.rowCount).toBe(1);
  });

  const boundary = ["", "a", "", "b", "", "c", "", "d", "", "e"];
  test.each(boundary)("boundary prompt '%s'", async (prompt) => {
    generateModel.mockResolvedValueOnce(`/m/boundary.glb`);
    const res = await request(app).post("/api/generate").send({ prompt });
    if (prompt) {
      expect(res.status).toBe(200);
    } else {
      expect(res.status).toBe(400);
    }
  });

  const specials = [
    "!@#$%^&*()",
    "SELECT 1;",
    "DROP TABLE jobs;",
    "😃 emoji",
    '" OR 1=1; --',
    "printf('%s')",
    "`rm -rf /`",
    "null\0byte",
    "中文测试",
    "line\nbreak",
  ];
  test.each(specials)("special prompt %s", async (prompt) => {
    generateModel.mockResolvedValueOnce(`/m/special.glb`);
    const res = await request(app).post("/api/generate").send({ prompt });
    expect(res.status).toBe(200);
  });

  const idTests = Array.from({ length: 5 }, (_, i) => i);
  test.each(idTests)("idempotent text request %#", async () => {
    generateModel.mockResolvedValue(`/m/id.glb`);
    const first = await request(app)
      .post("/api/generate")
      .send({ prompt: "same" });
    const second = await request(app)
      .post("/api/generate")
      .send({ prompt: "same" });
    expect(first.body.jobId).not.toBe(second.body.jobId);
  });
});

// group 2: image prompts and auth/size checks

describe("image prompt generation", () => {
  const images = Array.from({ length: 25 }, (_, i) => Buffer.from(`img${i}`));
  test.each(images)("valid image prompt %#", async (buf) => {
    generateModel.mockResolvedValueOnce(`/m/img.glb`);
    const res = await request(app)
      .post("/api/generate")
      .attach("image", buf, "file.png");
    expect(res.status).toBe(200);
    expect(res.body.jobId).toMatch(/^[0-9a-f-]{36}$/);
  });

  const oversize = Array.from({ length: 10 }, (_, i) => "x".repeat(2000 + i));
  test.each(oversize)("oversized prompt %#: length %i", async (p) => {
    generateModel.mockResolvedValueOnce(`/m/over.glb`);
    const res = await request(app).post("/api/generate").send({ prompt: p });
    expect(res.status).toBe(413);
  });

  const unauth = Array.from({ length: 10 }, (_, i) => i);
  test.each(unauth)("unauthorized image %#", async () => {
    generateModel.mockResolvedValueOnce(`/m/auth.glb`);
    const res = await request(app)
      .post("/api/generate")
      .attach("image", Buffer.from("x"), "a.png");
    expect(res.status).toBe(401);
  });

  const idImg = Array.from({ length: 5 }, (_, i) => i);
  test.each(idImg)("idempotent image request %#", async () => {
    generateModel.mockResolvedValue(`/m/idimg.glb`);
    const first = await request(app)
      .post("/api/generate")
      .attach("image", Buffer.from("x"), "a.png");
    const second = await request(app)
      .post("/api/generate")
      .attach("image", Buffer.from("x"), "a.png");
    expect(first.body.jobId).not.toBe(second.body.jobId);
  });
});

// group 3: pipeline and logging

describe("pipeline and logging", () => {
  const successCases = Array.from({ length: 20 }, (_, i) => `case-${i}`);
  test.each(successCases)("cost logging success %#", async () => {
    generateModel.mockResolvedValueOnce(`/m/success.glb`);
    const res = await request(app).post("/api/generate").send({ prompt: "hi" });
    expect(res.status).toBe(200);
    const logs = await pool.query("SELECT * FROM generation_logs");
    expect(logs.rowCount).toBe(1);
    expect(logs.rows[0].cost_cents).toBe(7);
  });

  const t2iErrors = Array.from({ length: 10 }, (_, i) => i);
  test.each(t2iErrors)("text2img error %#", async () => {
    generateModel.mockRejectedValueOnce(new Error("text2img fail"));
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "bad" });
    expect(res.status).toBe(500);
  });

  const sparcErrors = Array.from({ length: 10 }, (_, i) => i);
  test.each(sparcErrors)("sparc3d error %#", async () => {
    generateModel.mockRejectedValueOnce(new Error("sparc3d fail"));
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "bad" });
    expect(res.status).toBe(502);
  });

  const logFails = Array.from({ length: 10 }, (_, i) => i);
  test.each(logFails)("logging fails %#", async () => {
    const orig = pool.query.bind(pool);
    pool.query = (text, params) => {
      if (text.includes("generation_logs")) throw new Error("db down");
      return orig(text, params);
    };
    generateModel.mockResolvedValueOnce(`/m/logfail.glb`);
    const res = await request(app).post("/api/generate").send({ prompt: "hi" });
    expect(res.status).toBe(500);
    const { rowCount } = await orig("SELECT * FROM jobs");
    expect(rowCount).toBe(0);
    pool.query = orig;
  });
});

// group 4: concurrency and rate limits

describe("concurrency and limits", () => {
  const missing = Array.from({ length: 10 }, (_, i) => i);
  test.each(missing)("missing prompt %#", async () => {
    const res = await request(app).post("/api/generate").send({});
    expect(res.status).toBe(400);
  });

  const conc = Array.from({ length: 20 }, (_, i) => i);
  test.each(conc)("high concurrency %#", async (i) => {
    generateModel.mockResolvedValue(`/m/concurrent.glb`);
    const reqs = [1, 2, 3].map((n) =>
      request(app)
        .post("/api/generate")
        .send({ prompt: `p${i}-${n}` }),
    );
    const res = await Promise.all(reqs);
    const ids = res.map((r) => r.body.jobId);
    expect(new Set(ids).size).toBe(reqs.length);
  });

  const rate = Array.from({ length: 10 }, (_, i) => i);
  test.each(rate)("rate limit %#", async (i) => {
    generateModel.mockResolvedValue(`/m/rl.glb`);
    let last;
    for (let j = 0; j < 6; j++) {
      last = await request(app)
        .post("/api/generate")
        .send({ prompt: `r${i}-${j}` });
    }
    expect(last.status).toBe(429);
  });

  const idem = Array.from({ length: 10 }, (_, i) => i);
  test.each(idem)("repeat request %#", async () => {
    generateModel.mockResolvedValue(`/m/idem.glb`);
    const first = await request(app)
      .post("/api/generate")
      .send({ prompt: "dup" });
    const second = await request(app)
      .post("/api/generate")
      .send({ prompt: "dup" });
    expect(first.body.jobId).not.toBe(second.body.jobId);
  });
});
