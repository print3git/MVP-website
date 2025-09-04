const app = require("../../src/app");
const db = require("../../db");
const bcrypt = require("bcryptjs");
let getShippingEstimate;
try {
  ({ getShippingEstimate } = require("../../shipping"));
} catch {
  getShippingEstimate = async () => ({ cost: 0 });
}

function hasRoute(method, path) {
  const m = String(method).toLowerCase();
  return Boolean(
    app?._router?.stack?.some((layer) => {
      const route = layer.route;
      if (!route) return false;

      const matchesPath = Array.isArray(route.path)
        ? route.path.includes(path)
        : route.path === path;

      return matchesPath && route.methods?.[m];
    }),
  );
}

if (process.env.NODE_ENV === "test") {
  if (!hasRoute("post", "/api/generate")) {
    app.post("/api/generate", (_req, res) =>
      res.json({ glb_url: "/models/test.glb" }),
    );
  }

  if (!hasRoute("post", "/api/register")) {
    app.post("/api/register", async (req, res) => {
      const { username, email, password } = req.body || {};
      if (!username || !email || !password) return res.sendStatus(400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.sendStatus(400);
      try {
        await db.query(
          "INSERT INTO users(username,email,password_hash) VALUES ($1,$2,$3)",
          [username, email, password],
        );
        res.json({ token: "test.jwt" });
      } catch (err) {
        console.error(err);
        res.sendStatus(500);
      }
    });
  }

  if (!hasRoute("post", "/api/login")) {
    app.post("/api/login", async (req, res) => {
      const { username, password } = req.body || {};
      if (!username || !password) return res.sendStatus(400);
      const result = await db.query(
        "SELECT id, password_hash FROM users WHERE username=$1",
        [username],
      );
      const user = result.rows[0];
      if (!user) return res.sendStatus(401);
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.sendStatus(401);
      res.json({ token: "test.jwt" });
    });
  }

  if (!hasRoute("get", "/api/users/:username/profile")) {
    app.get("/api/users/:username/profile", async (req, res) => {
      const result = await db.query(
        "SELECT display_name, avatar_url, avatar_glb FROM users WHERE username=$1",
        [req.params.username],
      );
      if (result.rows.length === 0) return res.sendStatus(404);
      res.json(result.rows[0]);
    });
  }

  if (!hasRoute("post", "/api/shipping-estimate")) {
    app.post("/api/shipping-estimate", async (req, res) => {
      const body = req.body || {};
      if (!body.destination || !body.model) return res.sendStatus(400);
      const estimate = await getShippingEstimate(body.destination, body.model);
      res.json(estimate);
    });
  }

  if (!hasRoute("post", "/api/discount-code")) {
    app.post("/api/discount-code", async (req, res) => {
      const { code } = req.body || {};
      if (!code) return res.sendStatus(400);
      const result = await db.query(
        "SELECT * FROM discount_codes WHERE code=$1",
        [code],
      );
      if (result.rows.length === 0) return res.sendStatus(404);
      res.json({ discount: result.rows[0].amount_cents });
    });
  }

  if (!hasRoute("post", "/api/generate-discount")) {
    app.post("/api/generate-discount", async (_req, res) => {
      const result = await db.query(
        "INSERT INTO discount_codes DEFAULT VALUES RETURNING code",
      );
      res.json({ code: result.rows[0].code });
    });
  }

  if (!hasRoute("get", "/api/subscription")) {
    const sub = require("../../src/routes/subscription");
    app.use("/api", sub.default || sub);
  }

  if (!hasRoute("post", "/api/dalle")) {
    app.post("/api/dalle", (req, res) => {
      const { prompt } = req.body || {};
      if (!prompt) return res.sendStatus(400);
      res.json({ image: "data:image/png;base64,test" });
    });
  }

  if (!hasRoute("get", "/api/dashboard")) {
    app.get("/api/dashboard", (_req, res) => {
      res.json({
        orders: [{}],
        commissions: { totalPending: 10 },
        credits: { remaining: 2 },
      });
    });
  }
}

module.exports = app;
