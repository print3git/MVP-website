const request = require("supertest");
const jwt = require("jsonwebtoken");
require("dotenv").config();

jest.mock("../backend/db", () => ({
  query: jest.fn(),
}));
const db = require("../backend/db");

function getApp() {
  return require("../backend/server");
}

const adminToken = jwt.sign(
  { id: "admin", role: "admin" },
  process.env.AUTH_SECRET || "secret",
);
const userToken = jwt.sign(
  { id: "user", role: "user" },
  process.env.AUTH_SECRET || "secret",
);

// 1. GET /api/config/stripe -> returns { publishableKey }
describe("GET /api/config/stripe returns key", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`publishableKey present ${i}`, async () => {
      const res = await request(app).get("/api/config/stripe");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("publishableKey");
    });
  }
});

// 2. Missing env var should error
describe("GET /api/config/stripe missing env", () => {
  for (let i = 0; i < 10; i++) {
    test(`missing env ${i}`, async () => {
      const original = process.env.STRIPE_PUBLISHABLE_KEY;
      delete process.env.STRIPE_PUBLISHABLE_KEY;
      jest.resetModules();
      const app = getApp();
      const res = await request(app).get("/api/config/stripe");
      expect(res.status).toBe(500);
      expect(String(res.body.error || "")).toMatch(/publishable/i);
      process.env.STRIPE_PUBLISHABLE_KEY = original;
    });
  }
});

// 3. Caching headers
describe("GET /api/config/stripe caching", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`cache headers ${i}`, async () => {
      const res = await request(app).get("/api/config/stripe");
      expect(res.headers["cache-control"]).toMatch(/max-age/);
    });
  }
});

// 4. daily prints basic
describe("GET /api/stats/daily-prints", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`daily prints ${i}`, async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ date: "2024-01-01", count: 5 }],
      });
      const res = await request(app)
        .get("/api/stats/daily-prints")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("date");
      expect(res.body).toHaveProperty("count");
    });
  }
});

// 5. daily prints for date
describe("GET /api/stats/daily-prints?date", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`daily prints date ${i}`, async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: 7 }] });
      const res = await request(app)
        .get("/api/stats/daily-prints?date=2024-01-02")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBeDefined();
    });
  }
});

// 6. future date invalid
describe("GET /api/stats/daily-prints future", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`future date ${i}`, async () => {
      const res = await request(app)
        .get("/api/stats/daily-prints?date=2999-12-31")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  }
});

// 7. db down returns 502
describe("GET /api/stats/daily-prints db down", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`db fail ${i}`, async () => {
      db.query.mockRejectedValueOnce(new Error("db down"));
      const res = await request(app)
        .get("/api/stats/daily-prints")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(502);
    });
  }
});

// 8. total prints
describe("GET /api/stats/total-prints", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`total prints ${i}`, async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: 100 }] });
      const res = await request(app)
        .get("/api/stats/total-prints")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(100);
    });
  }
});

// 9. total prints none
describe("GET /api/stats/total-prints empty", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`total prints none ${i}`, async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .get("/api/stats/total-prints")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });
  }
});

// 10. pagination
describe("GET /api/analytics/daily-sales pagination", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`pagination ${i}`, async () => {
      db.query.mockResolvedValueOnce({ rows: [1, 2, 3] });
      const res = await request(app)
        .get("/api/analytics/daily-sales?limit=2&offset=1")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(db.query).toHaveBeenCalled();
    });
  }
});

// 11. auth required
describe("stats endpoints auth", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`missing token ${i}`, async () => {
      const res = await request(app).get("/api/stats/daily-prints");
      expect(res.status).toBe(401);
    });
  }
});

// 12. role based access
describe("stats endpoints role enforcement", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`user forbidden ${i}`, async () => {
      const res = await request(app)
        .get("/api/stats/daily-prints")
        .set("authorization", `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });
  }
});

// 13. rate-limit headers
describe("rate limit headers", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`rate header ${i}`, async () => {
      const res = await request(app).get("/api/config/stripe");
      expect(res.headers).toHaveProperty("x-ratelimit-limit");
    });
  }
});

// 14. metrics path
describe("metrics namespace", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`metrics route ${i}`, async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
      const res = await request(app)
        .get("/api/metrics/daily-prints")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  }
});

// 15. input validation
describe("input validation", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`invalid date ${i}`, async () => {
      const res = await request(app)
        .get("/api/stats/daily-prints?date=not-a-date")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  }
});

// 16. non integer limit/offset
describe("non integer limit offset", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`bad params ${i}`, async () => {
      const res = await request(app)
        .get("/api/analytics/daily-sales?limit=a&offset=b")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  }
});

// 17. response time
describe("response time under 50ms", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`time check ${i}`, async () => {
      const start = Date.now();
      await request(app)
        .get("/api/config/stripe")
        .set("authorization", `Bearer ${adminToken}`);
      expect(Date.now() - start).toBeLessThan(50);
    });
  }
});

// 18. historical counts query
describe("db query historical", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`query check ${i}`, async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: 5 }] });
      await request(app)
        .get("/api/stats/daily-prints?date=2024-01-01")
        .set("authorization", `Bearer ${adminToken}`);
      expect(db.query).toHaveBeenCalled();
    });
  }
});

// 19. tls enforcement header
describe("tls enforcement", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`hsts header ${i}`, async () => {
      const res = await request(app).get("/api/config/stripe");
      expect(res.headers).toHaveProperty("strict-transport-security");
    });
  }
});

// 20. overview endpoint
describe("GET /api/overview", () => {
  const app = getApp();
  for (let i = 0; i < 10; i++) {
    test(`overview ${i}`, async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      const res = await request(app)
        .get("/api/overview")
        .set("authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("config");
      expect(res.body).toHaveProperty("stats");
    });
  }
});
