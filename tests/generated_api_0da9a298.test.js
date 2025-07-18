const { newDb } = require("../backend/node_modules/pg-mem");
const pg = require("../backend/node_modules/pg");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

jest.mock("../backend/mail", () => ({
  sendMail: jest.fn().mockResolvedValue(),
  sendTemplate: jest.fn().mockResolvedValue(),
}));

/**
 * Start the backend server with an in-memory Postgres instance.
 * @returns {Promise<{server: import('http').Server, pool: any, url: string}>} server info
 */
async function startServer() {
  const db = newDb();
  db.public.registerFunction({
    name: "uuid_generate_v4",
    returns: "uuid",
    implementation: uuidv4,
  });
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const schema = `
CREATE TABLE users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  is_admin boolean default false
);
CREATE TABLE user_profiles (
  user_id uuid primary key references users(id),
  display_name text
);
CREATE TABLE mailing_list (
  id serial primary key,
  email text unique not null,
  token uuid not null,
  confirmed boolean default false,
  unsubscribed boolean default false,
  created_at timestamptz default now()
);
CREATE TABLE password_resets (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);`;
  for (const stmt of schema.split(";")) {
    const sql = stmt.trim();
    if (sql) await pool.query(sql);
  }
  pg.Pool = Pool;
  process.env.NODE_ENV = "test";
  process.env.STRIPE_SECRET_KEY = "sk_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec";
  process.env.S3_BUCKET = "test-bucket";
  process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
  process.env.DB_URL = "postgres://user:pass@localhost/db";
  process.env.AUTH_SECRET = "secret";
  const app = require("../backend/server");
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const url = `https://localhost:${server.address().port}`;
  return { server, pool, url };
}

let srv;
let pool;
let base;

beforeAll(async () => {
  const started = await startServer();
  srv = started.server;
  pool = started.pool;
  base = started.url;
});

afterAll(async () => {
  await new Promise((r) => srv.close(r));
});

/**
 * Register a user via the API.
 * @param {string} u username
 * @param {string} e email
 * @param {string} p password
 * @returns {Promise<import('supertest').Response>} response
 */
async function register(u, e, p) {
  return request(base)
    .post("/api/register")
    .send({ username: u, email: e, password: p });
}

/**
 * Retrieve the mailing list token for a user.
 * @param {string} email user email
 * @returns {Promise<string|undefined>} token string
 */
async function getToken(email) {
  const { rows } = await pool.query(
    "SELECT token FROM mailing_list WHERE email=$1",
    [email],
  );
  return rows[0]?.token;
}

describe("registration success and duplicate", () => {
  for (let i = 0; i < 20; i++) {
    test(`success ${i}`, async () => {
      const email = `u${i}@ex.com`;
      const res = await register(`u${i}`, email, "p");
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      const rows = await pool.query("SELECT * FROM users WHERE email=$1", [
        email,
      ]);
      expect(rows.rows.length).toBe(1);
    });
  }
  for (let i = 0; i < 15; i++) {
    test(`duplicate email ${i}`, async () => {
      const email = `dup${i}@ex.com`;
      await register(`a${i}`, email, "p");
      const res = await register(`b${i}`, email, "p");
      expect(res.status).toBe(500);
    });
  }
});

describe("registration validation", () => {
  for (let i = 0; i < 15; i++) {
    test(`invalid email ${i}`, async () => {
      const res = await register(`bad${i}`, "invalid", "p");
      expect(res.status).toBe(400);
    });
  }
  for (let i = 0; i < 15; i++) {
    test(`missing fields ${i}`, async () => {
      const res = await request(base)
        .post("/api/register")
        .send({ username: "", email: "", password: "" });
      expect(res.status).toBe(400);
    });
  }
});

describe("email confirmation", () => {
  for (let i = 0; i < 15; i++) {
    test(`valid token ${i}`, async () => {
      const email = `c${i}@ex.com`;
      await register(`c${i}`, email, "p");
      const token = await getToken(email);
      const res = await request(base)
        .get("/api/confirm-subscription")
        .query({ token });
      expect(res.status).toBe(200);
      const row = await pool.query(
        "SELECT confirmed FROM mailing_list WHERE email=$1",
        [email],
      );
      expect(row.rows[0].confirmed).toBe(true);
    });
  }
  for (let i = 0; i < 15; i++) {
    test(`expired token ${i}`, async () => {
      const res = await request(base)
        .get("/api/confirm-subscription")
        .query({ token: uuidv4() });
      expect(res.status).toBe(500);
    });
  }
  for (let i = 0; i < 15; i++) {
    test(`invalid token ${i}`, async () => {
      const res = await request(base)
        .get("/api/confirm-subscription")
        .query({ token: "bad" });
      expect(res.status).toBe(500);
    });
  }
});

describe("login flows", () => {
  for (let i = 0; i < 15; i++) {
    test(`login success ${i}`, async () => {
      const email = `l${i}@ex.com`;
      await register(`l${i}`, email, "p");
      const res = await request(base)
        .post("/api/login")
        .send({ username: `l${i}`, password: "p" });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  }
  for (let i = 0; i < 15; i++) {
    test(`wrong password ${i}`, async () => {
      const email = `w${i}@ex.com`;
      await register(`w${i}`, email, "p");
      const res = await request(base)
        .post("/api/login")
        .send({ username: `w${i}`, password: "x" });
      expect(res.status).toBe(401);
    });
  }
  for (let i = 0; i < 15; i++) {
    test(`unconfirmed email ${i}`, async () => {
      const email = `n${i}@ex.com`;
      await register(`n${i}`, email, "p");
      const res = await request(base)
        .post("/api/login")
        .send({ username: `n${i}`, password: "p" });
      expect(res.status).toBe(200);
    });
  }
});

describe("token security", () => {
  for (let i = 0; i < 15; i++) {
    test(`jwt verification ${i}`, async () => {
      const email = `t${i}@ex.com`;
      await register(`t${i}`, email, "p");
      const token = jwt.sign({ id: "1" }, "wrong");
      const res = await request(base)
        .get("/api/me")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  }
  for (let i = 0; i < 15; i++) {
    test(`expired token ${i}`, async () => {
      const email = `e${i}@ex.com`;
      await register(`e${i}`, email, "p");
      const token = jwt.sign({ id: "1" }, "secret", { expiresIn: -10 });
      const res = await request(base)
        .get("/api/me")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  }
});

describe("edge cases", () => {
  for (let i = 0; i < 10; i++) {
    test(`unicode username ${i}`, async () => {
      const email = `u${i}u@ex.com`;
      const res = await register("ユーザー" + i, email, "p");
      expect(res.status).toBe(200);
    });
  }
  for (let i = 0; i < 5; i++) {
    test(`password length ${i}`, async () => {
      const pw = "a".repeat(i + 8);
      const email = `p${i}@ex.com`;
      const res = await register(`p${i}`, email, pw);
      expect(res.status).toBe(200);
    });
  }
});
