// backend/server.js

require("dotenv").config();
const express = require("express");
const http2 = require("http2");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const morgan = require("morgan");
const compression = require("compression");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const config = require("./config");
const prohibitedCountries = ["CU", "IR", "KP", "RU", "SY"];
const generateTitle = require("./utils/generateTitle");
const stripe = require("stripe")(config.stripeKey);
const campaigns = require("./campaigns.json");
const {
  initDailyPrintsSold,
  getDailyPrintsSold,
} = require("./utils/dailyPrints");
const {
  enqueuePrint,
  processQueue,
  progressEmitter,
  COMPLETE_EVENT,

} = require('./queue/printQueue');
const { enqueuePrint: enqueueDbPrint } = require('./queue/dbPrintQueue');
const sliceModel = require('./printers/slicer');
const { sendMail, sendTemplate } = require('./mail');
const { getShippingEstimate } = require('./shipping');
const {
  validateDiscountCode,
  getValidDiscountCode,
  incrementDiscountUsage,
  createTimedCode,
} = require("./discountCodes");
const { verifyTag } = require("./social");
const QRCode = require("qrcode");
const generateAdCopy = require("./utils/generateAdCopy");
const generateShareCard = require("./utils/generateShareCard");

const syncMailingList = require("./scripts/sync-mailing-list");
const runScalingEngine = require("./scalingEngine");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin";

const AUTH_SECRET = process.env.AUTH_SECRET || "secret";

function logError(...args) {
  if (process.env.NODE_ENV !== "test") {
    console.error(...args);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Array of subreddit quote entries stored server-side
let subredditModels = [];
try {
  const modelsPath = path.join(__dirname, "subreddit_models.json");
  const raw = fs.readFileSync(modelsPath, "utf8");
  subredditModels = JSON.parse(raw);
} catch (err) {
  logError("Failed to load subreddit_models.json", err);
}

// Notify users when their print job completes
progressEmitter.on(COMPLETE_EVENT, async ({ jobId }) => {
  try {
    await db.query("UPDATE print_jobs SET status='complete' WHERE job_id=$1", [jobId]);
    const { rows } = await db.query(
      `SELECT u.email
         FROM orders o
         JOIN users u ON o.user_id=u.id
        WHERE o.job_id=$1
        ORDER BY o.created_at ASC
        LIMIT 1`,
      [jobId],
    );
    if (rows.length) {
      await sendMail(
        rows[0].email,
        "Print Finished",
        `Your print for job ${jobId} has finished. We'll ship it soon!`,
      );
    }
  } catch (err) {
    logError("Failed to send completion email", err);
  }
});

let competitionWinners = [];
try {
  const winnersPath = path.join(__dirname, "competition_winners.json");
  const raw = fs.readFileSync(winnersPath, "utf8");
  competitionWinners = JSON.parse(raw);
} catch (err) {
  logError("Failed to load competition_winners.json", err);
}

let generatedAds = [];
const adsPath = path.join(__dirname, "generated_ads.json");
try {
  const raw = fs.readFileSync(adsPath, "utf8");
  generatedAds = JSON.parse(raw);
} catch (err) {
  logError("Failed to load generated_ads.json", err);
}

function saveGeneratedAds() {
  fs.writeFileSync(adsPath, JSON.stringify(generatedAds, null, 2));
}

const app = express();
app.use(morgan("dev"));
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
const staticOptions = {
  setHeaders(res, filePath) {
    if (/\.(?:glb|hdr|js|css|png|jpe?g|gif|svg)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
};
app.use(express.static(path.join(__dirname, ".."), staticOptions));
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

const PORT = config.port;
const FALLBACK_GLB =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

function computePrintSlots(date = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    hour: "numeric",
  });
  const hour = parseInt(dtf.format(date), 10);
  if (hour >= 1 && hour < 4) return 9;
  if (hour >= 4 && hour < 7) return 8;
  if (hour >= 7 && hour < 10) return 7;
  if (hour >= 10 && hour < 13) return 6;
  if (hour >= 13 && hour < 16) return 5;
  if (hour >= 16 && hour < 19) return 4;
  if (hour >= 19 && hour < 22) return 3;
  if (hour >= 22 && hour < 24) return 2;
  return 1; // 12am - 1am
}

function authOptional(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, AUTH_SECRET);
    } catch {
      // ignore invalid token
    }
  }
  next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });
}

app.post("/api/register", async (req, res) => {
  const { username, displayName, email, password } = req.body;
  if (!username || !displayName || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      "INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id,username",
      [username, email, hash],
    );
    await db.query(
      "INSERT INTO user_profiles(user_id, display_name) VALUES($1,$2)",
      [rows[0].id, displayName],
    );
    const mlToken = uuidv4();
    await db.upsertMailingListEntry(email, mlToken);
    const confirmUrl = `${req.headers.origin}/api/confirm-subscription?token=${mlToken}`;
    await sendMail(
      email,
      "Confirm Subscription",
      `Click to confirm: ${confirmUrl}`,
    );
    const token = jwt.sign(
      { id: rows[0].id, username, isAdmin: false },
      AUTH_SECRET,
    );
    res.json({ token, isAdmin: false });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /api/dalle
 * Generate an image via the DALL-E mock service
 */
app.post("/api/dalle", async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Prompt required" });
  try {
    const resp = await axios.post(`${config.dalleServerUrl}/generate`, {
      prompt,
    });
    res.json({ image: resp.data.image });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE username=$1", [
      username,
    ]);
    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user.id, username, isAdmin: user.is_admin === true },
      AUTH_SECRET,
    );
    res.json({ token, isAdmin: user.is_admin === true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/request-password-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    const { rows } = await db.query(
      "SELECT id, username FROM users WHERE email=$1",
      [email],
    );
    if (!rows.length) return res.sendStatus(204);
    const user = rows[0];
    const token = uuidv4();
    const expires = new Date(Date.now() + 3600 * 1000);
    await db.query(
      "INSERT INTO password_resets(user_id, token, expires_at) VALUES($1,$2,$3)",
      [user.id, token, expires],
    );
    const url = `${req.headers.origin}/reset-password.html?token=${token}`;
    await sendTemplate(email, "Password Reset", "password_reset.txt", {
      username: user.username,
      reset_url: url,
    });
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    const { rows } = await db.query(
      "SELECT user_id, expires_at FROM password_resets WHERE token=$1",
      [token],
    );
    if (!rows.length) return res.status(400).json({ error: "Invalid token" });
    const reset = rows[0];
    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: "Token expired" });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      hash,
      reset.user_id,
    ]);
    await db.query("DELETE FROM password_resets WHERE token=$1", [token]);
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

app.get("/api/me", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, username, email FROM users WHERE id=$1",
      [req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    const user = rows[0];
    const profile = await db.query(
      "SELECT display_name, avatar_url, shipping_info, payment_info, competition_notify FROM user_profiles WHERE user_id=$1",
      [req.user.id],
    );
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: profile.rows[0]?.display_name || null,
      avatarUrl: profile.rows[0]?.avatar_url || null,
      profile: profile.rows[0] || {},
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

/**
 * POST /api/generate
 * Accept a prompt and optional image uploads
 */
app.post(
  "/api/generate",
  authOptional,
  upload.array("images"),
  async (req, res) => {
    const { prompt } = req.body;
    const files = req.files || [];
    if (!prompt && files.length === 0) {
      return res.status(400).json({ error: "Prompt or image is required" });
    }

    const jobId = uuidv4();
    const imageRef = files[0] ? files[0].filename : null;
    const snapshot = req.body.snapshot || null;
    const userId = req.user ? req.user.id : null;

    try {
      await db.query(
        "INSERT INTO jobs(job_id, prompt, image_ref, status, user_id, snapshot) VALUES ($1,$2,$3,$4,$5,$6)",
        [jobId, prompt, imageRef, "pending", userId, snapshot],
      );

      const form = new FormData();
      form.append("prompt", prompt);
      if (files[0]) {
        form.append("image", fs.createReadStream(files[0].path));
      }
      let generatedUrl = FALLBACK_GLB;
      try {
        const resp = await axios.post(
          `${config.hunyuanServerUrl}/generate`,
          form,
          {
            headers: form.getHeaders(),
          },
        );
        generatedUrl = resp.data.glb_url;
      } catch (err) {
        logError("Hunyuan service failed, using fallback", err.message);
      }

      const autoTitle = generateTitle(prompt);
      await db.query(
        "UPDATE jobs SET status=$1, model_url=$2, generated_title=$3 WHERE job_id=$4",
        ["complete", generatedUrl, autoTitle, jobId],
      );

      // Automatically add new models to the community gallery
      await db.query(
        "INSERT INTO community_creations(job_id, title, category, user_id) SELECT $1,$2,$3,$4 WHERE NOT EXISTS (SELECT 1 FROM community_creations WHERE job_id=$1)",
        [jobId, prompt || "", "", userId],
      );

      res.json({ jobId, glb_url: generatedUrl });
    } catch (err) {
      logError(err);
      res.status(500).json({ error: "Failed to generate model" });
    }
  },
);

/**
 * GET /api/status
 * List recent jobs with pagination
 */
app.get("/api/status", async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  try {
    const { rows } = await db.query(
      "SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

/**
 * GET /api/status/:jobId
 * Poll job status and retrieve the model URL when ready
 */
app.get("/api/status/:jobId", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM jobs WHERE job_id=$1", [
      req.params.jobId,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    const job = rows[0];
    res.json({
      jobId: job.job_id,
      status: job.status,
      model_url: job.model_url,
      generated_title: job.generated_title,
      error: job.error,
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

/**
 * GET /api/config/stripe
 * Retrieve the Stripe publishable key
 */
app.get("/api/config/stripe", (req, res) => {
  res.json({ publishableKey: config.stripePublishable });
});

/**
 * GET /api/print-slots
 * Return the current number of available print slots
 */
app.get("/api/print-slots", (req, res) => {
  res.json({ slots: computePrintSlots() });
});

/**
 * GET /api/stats
 * Return recent sales and average rating
 */
app.get("/api/stats", (req, res) => {
  try {
    const printsSold = getDailyPrintsSold();
    const averageRating = 4.8;
    res.json({ printsSold, averageRating });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/api/campaign", (req, res) => {
  res.json(campaigns);
});

app.get("/api/init-data", authOptional, async (req, res) => {
  const result = { slots: computePrintSlots(), campaign: campaigns };
  try {
    result.stats = { printsSold: getDailyPrintsSold(), averageRating: 4.8 };
    if (req.user) {
      const { rows } = await db.query(
        "SELECT * FROM user_profiles WHERE user_id=$1",
        [req.user.id],
      );
      if (rows.length) result.profile = rows[0];
    }
    res.json(result);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to load init data" });
  }
});

app.get("/api/payment-init", authOptional, async (req, res) => {
  const result = {
    slots: computePrintSlots(),
    publishableKey: config.stripePublishable,
    campaign: campaigns,
  };
  try {
    const { rows: saleRows } = await db.query(
      `SELECT * FROM flash_sales
       WHERE active=TRUE AND start_time<=NOW() AND end_time>NOW()
       ORDER BY start_time DESC LIMIT 1`,
    );
    if (saleRows.length) result.flashSale = saleRows[0];
    if (req.user) {
      const { rows } = await db.query(
        "SELECT * FROM user_profiles WHERE user_id=$1",
        [req.user.id],
      );
      if (rows.length) result.profile = rows[0];
    }
    res.json(result);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to load payment data" });
  }
});

/**
 * GET /api/subreddit/:name
 * Retrieve model and quote for a subreddit
 */
app.get("/api/subreddit/:name", (req, res) => {
  const sr = req.params.name.toLowerCase();
  const matches = subredditModels.filter(
    (e) => (e.subreddit || "").toLowerCase() === sr,
  );
  if (matches.length === 0) {
    return res.status(404).json({ error: "Subreddit not found" });
  }
  const entry = matches[Math.floor(Math.random() * matches.length)];
  res.json(entry);
});

app.get("/api/progress/:jobId", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  const jobId = req.params.jobId;
  const send = (update) => {
    if (update.jobId === jobId) {
      res.write(`data: ${JSON.stringify(update)}\n\n`);
      if (update.progress === 100) {
        progressEmitter.removeListener("progress", send);
        res.end();
      }
    }
  };
  progressEmitter.on("progress", send);
  req.on("close", () => progressEmitter.removeListener("progress", send));
});

app.get("/api/my/models", authRequired, async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  try {
    const { rows } = await db.query(
      `SELECT job_id, prompt, model_url, status, is_public, created_at, snapshot
       FROM jobs
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset],
    );
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

app.get("/api/my/orders", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.session_id, o.job_id, o.price_cents, o.status, o.quantity, o.discount_cents, o.created_at,
              j.model_url, j.snapshot, j.prompt
       FROM orders o
       JOIN jobs j ON o.job_id=j.job_id
       WHERE o.user_id=$1
       ORDER BY o.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/api/users/:id/gifts/sent", authRequired, async (req, res) => {
  const userId = req.params.id;
  if (req.user.id !== userId) return res.status(403).json({ error: "Forbidden" });
  try {
    const gifts = await db.getSentGifts(userId);
    res.json(gifts);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch gifts" });
  }
});

app.get("/api/users/:id/gifts/received", authRequired, async (req, res) => {
  const userId = req.params.id;
  if (req.user.id !== userId) return res.status(403).json({ error: "Forbidden" });
  try {
    const gifts = await db.getReceivedGifts(userId);
    res.json(gifts);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch gifts" });
  }
});

app.get("/api/commissions", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM model_commissions WHERE seller_user_id=$1 ORDER BY created_at DESC",
      [req.user.id],
    );
    const totals = rows.reduce(
      (acc, row) => {
        if (row.status === "paid") acc.totalPaid += row.commission_cents;
        else if (row.status === "pending")
          acc.totalPending += row.commission_cents;
        return acc;
      },
      { totalPending: 0, totalPaid: 0 },
    );
    res.json({ commissions: rows, ...totals });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

app.get("/api/profile", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM user_profiles WHERE user_id=$1",
      [req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.post("/api/profile", authRequired, async (req, res) => {
  const { shippingInfo, paymentInfo, competitionNotify } = req.body;
  try {
    await db.query(
      `INSERT INTO user_profiles(user_id, shipping_info, payment_info, competition_notify)
       VALUES($1,$2,$3,$4)
       ON CONFLICT (user_id)
       DO UPDATE SET shipping_info=$2, payment_info=$3, competition_notify=$4`,
      [
        req.user.id,
        shippingInfo || {},
        paymentInfo || {},
        competitionNotify !== false,
      ],
    );
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post(
  "/api/profile/avatar",
  authRequired,
  upload.single("avatar"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const url = `/uploads/${req.file.filename}`;
      await db.query(
        `INSERT INTO user_profiles(user_id, avatar_url)
       VALUES($1,$2)
       ON CONFLICT (user_id) DO UPDATE SET avatar_url=$2`,
        [req.user.id, url],
      );
      res.json({ url });
    } catch (err) {
      logError(err);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  },
);

app.delete("/api/account", authRequired, async (req, res) => {
  try {
    await db.query("DELETE FROM jobs WHERE user_id=$1", [req.user.id]);
    await db.query("DELETE FROM orders WHERE user_id=$1", [req.user.id]);
    await db.query("DELETE FROM user_profiles WHERE user_id=$1", [req.user.id]);
    await db.query("DELETE FROM users WHERE id=$1", [req.user.id]);
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

app.post("/api/stripe/connect", authRequired, async (req, res) => {
  try {
    const profileRes = await db.query(
      "SELECT stripe_account_id FROM user_profiles WHERE user_id=$1",
      [req.user.id],
    );
    let accountId = profileRes.rows[0] && profileRes.rows[0].stripe_account_id;
    if (!accountId) {
      const emailRes = await db.query("SELECT email FROM users WHERE id=$1", [
        req.user.id,
      ]);
      const acct = await stripe.accounts.create({
        type: "express",
        email: emailRes.rows[0] && emailRes.rows[0].email,
      });
      accountId = acct.id;
      await db.query(
        "UPDATE user_profiles SET stripe_account_id=$1 WHERE user_id=$2",
        [accountId, req.user.id],
      );
    }
    const origin = req.headers.origin || "";
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/stripe-connect.html`,
      return_url: `${origin}/my_profile.html`,
      type: "account_onboarding",
    });
    res.json({ url: link.url });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create account link" });
  }
});

app.get("/api/subscription", authRequired, async (req, res) => {
  try {
    const sub = await db.getSubscription(req.user.id);
    if (!sub) return res.json({ active: false });
    res.json(sub);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

app.post("/api/subscription", authRequired, async (req, res) => {
  const {
    status,
    current_period_start,
    current_period_end,
    customer_id,
    subscription_id,
    variant,
    price_cents,
  } = req.body;
  try {
    const sub = await db.upsertSubscription(
      req.user.id,
      status || "active",
      current_period_start,
      current_period_end,
      customer_id,
      subscription_id,
    );
    await db.ensureCurrentWeekCredits(req.user.id, 2);
    await db.insertSubscriptionEvent(req.user.id, "join", variant, price_cents);
    res.json(sub);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

app.post("/api/subscription/cancel", authRequired, async (req, res) => {
  try {
    const sub = await db.cancelSubscription(req.user.id);
    await db.insertSubscriptionEvent(req.user.id, "cancel", null, null);
    res.json(sub);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

app.post("/api/subscription/portal", authRequired, async (req, res) => {
  try {
    const sub = await db.getSubscription(req.user.id);
    if (!sub || !sub.stripe_customer_id) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${req.headers.origin}/my_profile.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

app.get("/api/subscription/credits", authRequired, async (req, res) => {
  try {
    await db.ensureCurrentWeekCredits(req.user.id, 2);
    const credits = await db.getCurrentWeekCredits(req.user.id);
    res.json({
      remaining: credits.total_credits - credits.used_credits,
      total: credits.total_credits,
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch credits" });
  }
});

app.get("/api/subscription/summary", authRequired, async (req, res) => {
  try {
    await db.ensureCurrentWeekCredits(req.user.id, 2);
    const [sub, credits] = await Promise.all([
      db.getSubscription(req.user.id),
      db.getCurrentWeekCredits(req.user.id),
    ]);
    res.json({
      subscription: sub || { active: false },
      credits: {
        remaining: credits.total_credits - credits.used_credits,
        total: credits.total_credits,
      },
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch subscription summary" });
  }
});

app.get("/api/dashboard", authRequired, async (req, res) => {
  try {
    await db.ensureCurrentWeekCredits(req.user.id, 2);
    const [user, profileRows, ordersRows, commissionsRows, credits] =
      await Promise.all([
        db.query("SELECT id, username, email FROM users WHERE id=$1", [
          req.user.id,
        ]),
        db.query(
          "SELECT display_name, avatar_url, shipping_info, payment_info, competition_notify FROM user_profiles WHERE user_id=$1",
          [req.user.id],
        ),
        db.query(
          `SELECT o.session_id, o.job_id, o.price_cents, o.status, o.quantity, o.discount_cents, o.created_at,
                j.model_url, j.snapshot, j.prompt
         FROM orders o
         JOIN jobs j ON o.job_id=j.job_id
         WHERE o.user_id=$1
         ORDER BY o.created_at DESC`,
          [req.user.id],
        ),
        db.query(
          "SELECT * FROM model_commissions WHERE seller_user_id=$1 ORDER BY created_at DESC",
          [req.user.id],
        ),
        db.getCurrentWeekCredits(req.user.id),
      ]);
    const totals = commissionsRows.rows.reduce(
      (acc, row) => {
        if (row.status === "paid") acc.totalPaid += row.commission_cents;
        else if (row.status === "pending")
          acc.totalPending += row.commission_cents;
        return acc;
      },
      { totalPending: 0, totalPaid: 0 },
    );
    res.json({
      profile: profileRows.rows[0] || {},
      user: user.rows[0],
      orders: ordersRows.rows,
      commissions: { commissions: commissionsRows.rows, ...totals },
      credits: {
        remaining: credits.total_credits - credits.used_credits,
        total: credits.total_credits,
      },
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

app.get("/api/referral-link", authRequired, async (req, res) => {
  try {
    const code = await db.getOrCreateReferralLink(req.user.id);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

app.get("/api/orders/:id/referral-link", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      "SELECT user_id FROM orders WHERE session_id=$1",
      [id],
    );
    if (!rows.length || rows[0].user_id !== req.user.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    const code = await db.getOrCreateOrderReferralLink(id);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

app.get("/api/orders/:id/referral-qr", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      "SELECT user_id FROM orders WHERE session_id=$1",
      [id],
    );
    if (!rows.length || rows[0].user_id !== req.user.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    const code = await db.getOrCreateOrderReferralLink(id);
    const base =
      req.headers.origin || process.env.SITE_URL || "http://localhost:3000";
    const url = `${base}?ref=${code}`;
    const png = await QRCode.toBuffer(url, { width: 256 });
    res.type("png").send(png);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

app.post("/api/referral-click", async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "Missing code" });
  try {
    const referrer = await db.getUserIdForReferral(code);
    if (!referrer) return res.status(404).json({ error: "Invalid code" });
    await db.insertReferralEvent(referrer, "click");
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record click" });
  }
});

app.post("/api/referral-signup", async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "Missing code" });
  try {
    const referrer = await db.getUserIdForReferral(code);
    if (!referrer) return res.status(404).json({ error: "Invalid code" });
    await db.insertReferralEvent(referrer, "signup");
    await db.adjustRewardPoints(referrer, 10);
    const discountCode = await createTimedCode(500, 168);
    res.json({ code: discountCode });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record signup" });
  }
});

app.post("/api/referral-post", authRequired, async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Missing url" });
  try {
    const ok = await verifyTag(url);
    if (!ok) return res.status(400).json({ error: "Tag not found" });
    const code = await createTimedCode(500, 168);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to verify post" });
  }
});

app.post("/api/social-shares", authRequired, async (req, res) => {
  const { orderId, url } = req.body || {};
  if (!orderId || !url) {
    return res.status(400).json({ error: "orderId and url required" });
  }
  try {
    const row = await db.insertSocialShare(req.user.id, orderId, url);
    res.status(201).json({ id: row.id, verified: row.verified });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to submit share" });
  }
});

app.post(
  "/api/admin/social-shares/:id/verify",
  adminCheck,
  async (req, res) => {
    const { id } = req.params;
    try {
      const code = await createTimedCode(500, 168);
      const row = await db.verifySocialShare(id, code);
      if (!row) return res.status(404).json({ error: "Share not found" });
      await db.query("INSERT INTO incentives(user_id, type) VALUES($1,$2)", [
        row.user_id,
        `post_share_${code}`,
      ]);
      res.json({ code });
    } catch (err) {
      logError(err);
      res.status(500).json({ error: "Failed to verify share" });
    }
  },
);

app.get("/api/rewards", authRequired, async (req, res) => {
  try {
    const points = await db.getRewardPoints(req.user.id);
    res.json({ points });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

app.get("/api/rewards/options", async (req, res) => {
  try {
    const options = await db.getRewardOptions();
    res.json({ options });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch options" });
  }
});

app.post("/api/rewards/redeem", authRequired, async (req, res) => {
  const cost = parseInt(req.body.points, 10);
  let discount = null;
  try {
    const opt = await db.getRewardOption(cost);
    discount = opt ? opt.amount_cents : null;
  } catch (err) {
    logError(err);
    return res.status(500).json({ error: "Failed to fetch reward options" });
  }
  if (!discount) return res.status(400).json({ error: "Invalid reward" });
  try {
    const current = await db.getRewardPoints(req.user.id);
    if (current < cost) {
      return res.status(400).json({ error: "Insufficient points" });
    }
    await db.adjustRewardPoints(req.user.id, -cost);
    const code = await createTimedCode(discount, 168);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
});

app.post("/api/gifts/:id/claim", async (req, res) => {
  const { id } = req.params;
  try {
    const giftRes = await db.query(
      `SELECT g.sender_id, g.model_id, u.email
         FROM gifts g
         JOIN users u ON g.sender_id=u.id
        WHERE g.id=$1 AND g.claimed_at IS NULL`,
      [id],
    );
    if (giftRes.rows.length === 0) {
      return res.status(404).json({ error: "Gift not found" });
    }
    const gift = giftRes.rows[0];
    await db.query("UPDATE gifts SET claimed_at=NOW() WHERE id=$1", [id]);
    const code = await createTimedCode(500, 168);
    await sendMail(
      gift.email,
      "Your gift was claimed!",
      `Thanks! Here is a referral coupon code: ${code}`,
    );
    const out = path.join(__dirname, "..", "uploads", `gift-${id}-share.png`);
    await generateShareCard(gift.model_id, out);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to claim gift" });
  }
});

app.post("/api/track/ad-click", async (req, res) => {
  const { subreddit, sessionId } = req.body || {};
  if (!subreddit || !sessionId)
    return res.status(400).json({ error: "Missing params" });
  try {
    await db.insertAdClick(subreddit, sessionId);
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record click" });
  }
});

app.post("/api/track/page", async (req, res) => {
  const { sessionId, subreddit, utmSource, utmMedium, utmCampaign } =
    req.body || {};
  if (!sessionId) return res.status(400).json({ error: "Missing params" });
  try {
    await db.insertPageView(
      sessionId,
      subreddit || null,
      utmSource,
      utmMedium,
      utmCampaign,
    );
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record page view" });
  }
});

app.post("/api/track/cart", async (req, res) => {
  const { sessionId, modelId, subreddit } = req.body || {};
  if (!sessionId || !modelId || !subreddit)
    return res.status(400).json({ error: "Missing params" });
  try {
    await db.insertCartEvent(sessionId, modelId, subreddit);
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record cart" });
  }
});

app.post("/api/track/checkout", async (req, res) => {
  const { sessionId, subreddit, step } = req.body || {};
  if (!sessionId || !subreddit || !step)
    return res.status(400).json({ error: "Missing params" });
  try {
    await db.insertCheckoutEvent(sessionId, subreddit, step);
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record checkout" });
  }
});

app.post("/api/track/share", async (req, res) => {
  const { shareId, network } = req.body || {};
  if (!shareId || !network)
    return res.status(400).json({ error: "Missing params" });
  try {
    await db.insertShareEvent(shareId, network);
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record share" });
  }
});

app.get("/api/metrics/conversion", async (req, res) => {
  try {
    const data = await db.getConversionMetrics();
    res.json(data);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

app.get("/api/metrics/profit", async (req, res) => {
  try {
    const data = await db.getProfitMetrics();
    res.json(data);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch profit metrics" });
  }
});

app.get("/api/metrics/business-intel", async (req, res) => {
  try {
    const data = await db.getBusinessIntelligenceMetrics();
    res.json(data);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch business metrics" });
  }
});

app.get("/api/users/:username/models", async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  try {
    const { rows } = await db.query("SELECT id FROM users WHERE username=$1", [
      req.params.username,
    ]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    const userId = rows[0].id;
    const models = await db.query(
      `SELECT j.job_id, j.prompt, j.model_url, j.status, j.is_public,
              j.created_at, j.snapshot,
              COALESCE(l.count,0) as likes
       FROM jobs j
       LEFT JOIN (SELECT model_id, COUNT(*) as count FROM likes GROUP BY model_id) l
       ON j.job_id=l.model_id
       WHERE j.user_id=$1 AND j.is_public=TRUE
       ORDER BY j.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    res.json(models.rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

app.get("/api/users/:username/profile", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.display_name, p.avatar_url
       FROM users u
       JOIN user_profiles p ON u.id=p.user_id
       WHERE u.username=$1`,
      [req.params.username],
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.post("/api/models/:id/like", authRequired, async (req, res) => {
  const modelId = req.params.id;
  try {
    const { rows } = await db.query(
      "SELECT 1 FROM likes WHERE user_id=$1 AND model_id=$2",
      [req.user.id, modelId],
    );
    if (rows.length) {
      await db.query("DELETE FROM likes WHERE user_id=$1 AND model_id=$2", [
        req.user.id,
        modelId,
      ]);
    } else {
      await db.query("INSERT INTO likes(user_id, model_id) VALUES($1,$2)", [
        req.user.id,
        modelId,
      ]);
    }
    const count = await db.query(
      "SELECT COUNT(*) FROM likes WHERE model_id=$1",
      [modelId],
    );
    res.json({ likes: parseInt(count.rows[0].count, 10) });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to update like" });
  }
});

app.post("/api/models/:id/public", authRequired, async (req, res) => {
  const jobId = req.params.id;
  const { isPublic } = req.body;
  if (typeof isPublic !== "boolean") {
    return res.status(400).json({ error: "isPublic required" });
  }
  try {
    const { rows } = await db.query(
      "UPDATE jobs SET is_public=$1 WHERE job_id=$2 AND user_id=$3 RETURNING is_public",
      [isPublic, jobId, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Model not found" });
    res.json({ is_public: rows[0].is_public });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to update model" });
  }
});

app.post("/api/models/:id/share", authRequired, async (req, res) => {
  const jobId = req.params.id;
  try {
    const slug = uuidv4();
    await db.insertShare(jobId, req.user.id, slug);
    res.json({ slug });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create share" });
  }
});

app.delete("/api/models/:id", authRequired, async (req, res) => {
  const jobId = req.params.id;
  try {
    const { rows } = await db.query(
      "DELETE FROM jobs WHERE job_id=$1 AND user_id=$2 RETURNING job_id",
      [jobId, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Model not found" });
    await db.query("DELETE FROM likes WHERE model_id=$1", [jobId]);
    await db.query("DELETE FROM shares WHERE job_id=$1", [jobId]);
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to delete model" });
  }
});

app.get("/api/shared/:slug", async (req, res) => {
  try {
    const share = await db.getShareBySlug(req.params.slug);
    if (!share) return res.status(404).json({ error: "Share not found" });
    const { rows } = await db.query(
      "SELECT prompt, model_url, snapshot FROM jobs WHERE job_id=$1",
      [share.job_id],
    );
    if (!rows.length) return res.status(404).json({ error: "Share not found" });
    res.json({
      jobId: share.job_id,
      slug: share.slug,
      model_url: rows[0].model_url,
      prompt: rows[0].prompt,
      snapshot: rows[0].snapshot,
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch share" });
  }
});

app.get("/shared/:slug", async (req, res) => {
  try {
    const share = await db.getShareBySlug(req.params.slug);
    if (!share) return res.status(404).send("Not found");
    const { rows } = await db.query(
      "SELECT prompt, model_url, snapshot FROM jobs WHERE job_id=$1",
      [share.job_id],
    );
    const prompt = rows[0]?.prompt || "Shared model";
    const ogImage = rows[0]?.snapshot
      ? `${req.protocol}://${req.get("host")}${rows[0].snapshot}`
      : `${req.protocol}://${req.get("host")}/img/boxlogo.png`;
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta property="og:title" content="print3 shared model" />
    <meta property="og:description" content="${prompt.replace(/"/g, "&quot;")}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:url" content="${req.protocol}://${req.get("host")}/shared/${share.slug}" />
  </head>
  <body>
    <script>window.location='/share.html?slug=${share.slug}'</script>
  </body>
</html>`);
  } catch (err) {
    logError(err);
    res.status(500).send("Server error");
  }
});

app.get("/community/model/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.title, j.prompt
       FROM community_creations c
       JOIN jobs j ON c.job_id=j.job_id
       WHERE c.id=$1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).send("Not found");
    const prompt = rows[0].title || rows[0].prompt || "Community model";
    const ogImage = `${req.protocol}://${req.get("host")}/img/boxlogo.png`;
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta property="og:title" content="print3 community model" />
    <meta property="og:description" content="${prompt.replace(/"/g, "&quot;")}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:url" content="${req.protocol}://${req.get("host")}/community/model/${req.params.id}" />
  </head>
  <body>
    <script>window.location='/share.html?community=${req.params.id}'</script>
  </body>
</html>`);
  } catch (err) {
    logError(err);
    res.status(500).send("Server error");
  }
});

// Submit a generated model to the community gallery
app.post("/api/community", authRequired, async (req, res) => {
  const { jobId, title, category } = req.body;
  if (!jobId) return res.status(400).json({ error: "jobId required" });
  try {
    const { rows } = await db.query(
      "SELECT generated_title FROM jobs WHERE job_id=$1",
      [jobId],
    );
    const autoTitle = rows[0] ? rows[0].generated_title : "";
    await db.query(
      "INSERT INTO community_creations(job_id, title, category, user_id) VALUES($1,$2,$3,$4)",
      [jobId, title || autoTitle, category || "", req.user.id],
    );
    res.sendStatus(201);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to submit" });
  }
});

function buildGalleryQuery(orderBy) {
  return `SELECT c.id, c.title, c.category, j.job_id, j.model_url, j.snapshot, COALESCE(l.count,0) as likes
          FROM community_creations c
          JOIN jobs j ON c.job_id=j.job_id
          LEFT JOIN (SELECT model_id, COUNT(*) as count FROM likes GROUP BY model_id) l
          ON j.job_id=l.model_id
          WHERE ($3::text IS NULL OR c.category=$3)
            AND ($4::text IS NULL OR c.title ILIKE '%' || $4 || '%')
          ORDER BY ${orderBy} LIMIT $1 OFFSET $2`;
}

app.get("/api/community/recent", async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  const category = req.query.category || null;
  const search = req.query.search || null;
  const order = req.query.order === "asc" ? "ASC" : "DESC";
  try {
    const { rows } = await db.query(
      buildGalleryQuery(`c.created_at ${order}`),
      [limit, offset, category, search],
    );
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch creations" });
  }
});

app.get("/api/community/popular", async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  const category = req.query.category || null;
  const search = req.query.search || null;
  try {
    const { rows } = await db.query(
      buildGalleryQuery("likes DESC, c.created_at DESC"),
      [limit, offset, category, search],
    );
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch creations" });
  }
});

app.get("/api/community/mine", authRequired, async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  try {
    const rows = await db.getUserCreations(req.user.id, limit, offset);
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch creations" });
  }
});

app.delete("/api/community/:id", authRequired, async (req, res) => {
  const id = req.params.id;
  try {
    const { rows } = await db.query(
      "DELETE FROM community_creations WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Creation not found" });

    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to delete creation" });
  }
});

app.get("/api/community/model/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.title, c.category, j.job_id, j.model_url, j.snapshot, j.prompt
       FROM community_creations c
       JOIN jobs j ON c.job_id=j.job_id
       WHERE c.id=$1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch model" });
  }
});

app.get("/api/community/:id/comments", async (req, res) => {
  try {
    const rows = await db.getCommunityComments(req.params.id);
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.post("/api/community/:id/comment", authRequired, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  try {
    const row = await db.insertCommunityComment(
      req.params.id,
      req.user.id,
      text,
    );
    res.status(201).json(row);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

app.get("/api/competitions/active", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM competitions WHERE end_date >= CURRENT_DATE ORDER BY start_date",
    );
    const comps = rows.map((c) => {
      const deadline = new Date(c.end_date);
      deadline.setUTCHours(23, 59, 59, 0);
      return { ...c, deadline: deadline.toISOString() };
    });
    res.json(comps);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch competitions" });
  }
});

app.get("/api/competitions/past", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.end_date, c.theme, j.model_url, j.snapshot, c.winner_model_id
       FROM competitions c
       LEFT JOIN jobs j ON c.winner_model_id=j.job_id
       WHERE c.end_date < CURRENT_DATE AND c.winner_model_id IS NOT NULL
       ORDER BY c.end_date DESC LIMIT 5`,
    );
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch past competitions" });
  }
});

app.get("/api/competitions/winners", (req, res) => {
  if (competitionWinners.length) {
    res.json(competitionWinners);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.get("/api/competitions/:id/entries", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.model_id, j.model_url, COALESCE(v.count,0) as votes
       FROM competition_entries e
       JOIN jobs j ON e.model_id=j.job_id
       LEFT JOIN (
         SELECT model_id, COUNT(*) as count
         FROM competition_votes
         WHERE competition_id=$1
         GROUP BY model_id
       ) v ON e.model_id=v.model_id
       WHERE e.competition_id=$1
       ORDER BY votes DESC`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

app.get("/api/competitions/:id/comments", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cc.id, cc.text, cc.created_at, u.username
       FROM competition_comments cc
       JOIN users u ON cc.user_id=u.id
       WHERE cc.competition_id=$1
       ORDER BY cc.created_at ASC`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.post("/api/competitions/:id/comments", authRequired, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  try {
    const { rows } = await db.query(
      `INSERT INTO competition_comments(competition_id, user_id, text)
       VALUES($1,$2,$3)
       RETURNING id, text, created_at`,
      [req.params.id, req.user.id, text],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

app.post("/api/competitions/:id/enter", authRequired, async (req, res) => {
  const { modelId } = req.body;
  try {
    await db.query(
      "INSERT INTO competition_entries(competition_id, model_id, user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [req.params.id, modelId, req.user.id],
    );
    res.sendStatus(201);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to submit entry" });
  }
});

app.post("/api/competitions/:id/discount", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT 1 FROM competition_entries WHERE competition_id=$1 AND user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!rows.length) {
      return res.status(400).json({ error: "No entry found" });
    }
    const code = await createTimedCode(500, 48);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to generate discount" });
  }
});

app.post("/api/competitions/:id/vote", authRequired, async (req, res) => {
  const { modelId } = req.body;
  if (!modelId) return res.status(400).json({ error: "modelId required" });
  const compId = req.params.id;
  try {
    await db.query(
      `INSERT INTO competition_votes(competition_id, model_id, user_id)
       VALUES($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [compId, modelId, req.user.id],
    );
    const count = await db.query(
      "SELECT COUNT(*) FROM competition_votes WHERE competition_id=$1 AND model_id=$2",
      [compId, modelId],
    );
    res.json({ votes: parseInt(count.rows[0].count, 10) });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to submit vote" });
  }
});

function adminCheck(req, res, next) {
  authOptional(req, res, () => {
    const headerMatch = req.headers["x-admin-token"] === ADMIN_TOKEN;
    const userAdmin = req.user && req.user.isAdmin === true;
    if (!headerMatch && !userAdmin) {
      return res.status(401).json({ error: "Admin token required" });
    }
    next();
  });
}

app.post("/api/admin/competitions", adminCheck, async (req, res) => {
  const { name, start_date, end_date, prize_description, theme } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO competitions(name,start_date,end_date,prize_description,theme)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [name, start_date, end_date, prize_description, theme],
    );
    const comp = rows[0];
    try {
      const recipients = await db.query(
        `SELECT u.email FROM users u JOIN user_profiles p ON u.id=p.user_id WHERE p.competition_notify=TRUE`,
      );
      for (const r of recipients.rows) {
        await sendMail(
          r.email,
          "New Competition",
          `A new competition "${comp.name}" has been created.`,
        );
      }
    } catch (err) {
      logError("Failed to send competition notification", err);
    }
    res.json(comp);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create competition" });
  }
});

app.put("/api/admin/competitions/:id", adminCheck, async (req, res) => {
  const {
    name,
    start_date,
    end_date,
    prize_description,
    winner_model_id,
    theme,
  } = req.body;
  try {
    const prev = await db.query(
      "SELECT winner_model_id FROM competitions WHERE id=$1",
      [req.params.id],
    );
    const prevWinner = prev.rows[0] && prev.rows[0].winner_model_id;
    const { rows } = await db.query(
      `UPDATE competitions SET name=$1, start_date=$2, end_date=$3, prize_description=$4, winner_model_id=$5, theme=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [
        name,
        start_date,
        end_date,
        prize_description,
        winner_model_id,
        theme,
        req.params.id,
      ],
    );
    const comp = rows[0];
    if (!prevWinner && winner_model_id) {
      try {
        const userRes = await db.query(
          "SELECT u.email FROM users u JOIN jobs j ON u.id=j.user_id WHERE j.job_id=$1",
          [winner_model_id],
        );
        if (userRes.rows.length) {
          const code = await createTimedCode(500, 168);
          await sendMail(
            userRes.rows[0].email,
            "Competition Prize",
            `Congratulations! Use code ${code} to claim your prize.`,
          );
        }
      } catch (err) {
        logError("Failed to send prize code", err);
      }
    }
    res.json(comp);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to update competition" });
  }
});

app.delete("/api/admin/competitions/:id", adminCheck, async (req, res) => {
  try {
    await db.query("DELETE FROM competitions WHERE id=$1", [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to delete competition" });
  }
});

app.post("/api/commissions/:id/mark-paid", adminCheck, async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE model_commissions SET status=$1 WHERE id=$2 RETURNING *",
      ["paid", req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Commission not found" });
    res.json(rows[0]);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to update commission" });
  }
});

app.post("/api/payouts", authRequired, async (req, res) => {
  try {
    const acctRes = await db.query(
      "SELECT stripe_account_id FROM user_profiles WHERE user_id=$1",
      [req.user.id],
    );
    const accountId = acctRes.rows[0] && acctRes.rows[0].stripe_account_id;
    if (!accountId) {
      return res.status(400).json({ error: "Stripe account not linked" });
    }
    const pendingRes = await db.query(
      "SELECT commission_cents FROM model_commissions WHERE seller_user_id=$1 AND status=$2",
      [req.user.id, "pending"],
    );
    const total = pendingRes.rows.reduce(
      (sum, r) => sum + r.commission_cents,
      0,
    );
    if (total === 0) return res.json({ totalPaid: 0 });
    const transfer = await stripe.transfers.create({
      amount: total,
      currency: "usd",
      destination: accountId,
      description: "Commission payout",
    });
    await db.query(
      "UPDATE model_commissions SET status='paid' WHERE seller_user_id=$1 AND status='pending'",
      [req.user.id],
    );
    res.json({ totalPaid: total, transferId: transfer.id });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Payout failed" });
  }
});

/**
 * POST /api/shipping-estimate
 * Calculate shipping cost and ETA
 */
app.post("/api/shipping-estimate", async (req, res) => {
  const { destination, model } = req.body;
  if (!destination || !model) {
    return res.status(400).json({ error: "destination and model required" });
  }
  try {
    const estimate = await getShippingEstimate(destination, model);
    res.json(estimate);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to get shipping estimate" });
  }
});

/**
 * POST /api/discount-code
 * Validate a discount code and return the amount in cents
 */
app.post("/api/discount-code", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "code required" });
  }
  const amount = await validateDiscountCode(code);
  if (!amount) {
    return res.status(404).json({ error: "Invalid code" });
  }
  res.json({ discount: amount });
});

/**
 * POST /api/generate-discount
 * Create a unique discount code valid for 48 hours
 */
app.post("/api/generate-discount", async (req, res) => {
  const amount = req.body.amount_cents || 500;
  try {
    const code = await createTimedCode(amount, 48);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to generate code" });
  }
});

app.get("/api/flash-sale", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM flash_sales
       WHERE active=TRUE AND start_time<=NOW() AND end_time>NOW()
       ORDER BY start_time DESC LIMIT 1`,
    );
    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch flash sale" });
  }
});

app.post("/api/admin/flash-sale", adminCheck, async (req, res) => {
  const { discount_percent, product_type, start_time, end_time } = req.body;
  if (discount_percent == null || !product_type || !start_time || !end_time) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const start = new Date(start_time);
  const end = new Date(end_time);
  if (!isFinite(start) || !isFinite(end) || start >= end) {
    return res.status(400).json({ error: "Invalid time range" });
  }
  try {
    await db.query("UPDATE flash_sales SET active=FALSE WHERE active=TRUE");
    const { rows } = await db.query(
      `INSERT INTO flash_sales(discount_percent, product_type, start_time, end_time, active)
       VALUES($1,$2,$3,$4,TRUE) RETURNING *`,
      [discount_percent, product_type, start.toISOString(), end.toISOString()],
    );
    res.json(rows[0]);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create sale" });
  }
});

app.delete("/api/admin/flash-sale/:id", adminCheck, async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE flash_sales SET active=FALSE WHERE id=$1 RETURNING *",
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to end sale" });
  }
});

app.get("/api/admin/spaces", adminCheck, async (req, res) => {
  try {
    const spaces = await db.listAllSpaces();
    res.json(spaces);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch spaces" });
  }
});

app.post("/api/admin/spaces", adminCheck, async (req, res) => {
  const { region, costCents, address } = req.body || {};

  if (!region || !address)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const space = await db.createSpace(region, costCents || null, address);
    res.json(space);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create space" });
  }
});

app.get("/api/admin/hubs", adminCheck, async (req, res) => {
  try {
    const hubs = await db.listPrinterHubs();
    const result = [];
    for (const hub of hubs) {
      const printers = await db.getPrintersByHub(hub.id);
      result.push({ ...hub, printers });
    }
    res.json(result);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch hubs" });
  }
});

app.post("/api/admin/hubs", adminCheck, async (req, res) => {
  const { name, location, operator } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    const hub = await db.createPrinterHub(
      name,
      location || null,
      operator || null,
    );
    res.json(hub);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create hub" });
  }
});

app.post("/api/admin/hubs/:id/printers", adminCheck, async (req, res) => {
  const { serial } = req.body || {};
  if (!serial) return res.status(400).json({ error: "Missing serial" });
  try {
    const printer = await db.addPrinter(serial, req.params.id);
    res.json(printer);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to add printer" });
  }
});

app.put("/api/admin/hubs/:id", adminCheck, async (req, res) => {
  const { location, operator } = req.body || {};
  try {
    const hub = await db.updatePrinterHub(
      req.params.id,
      location || null,
      operator || null,
    );
    res.json(hub);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to update hub" });
  }
});

app.get("/api/admin/hubs/:id/shipments", adminCheck, async (req, res) => {
  try {
    const shipments = await db.getHubShipments(req.params.id);
    res.json(shipments);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch shipments" });
  }
});
app.post("/api/admin/hubs/:id/shipments", adminCheck, async (req, res) => {
  const { carrier, trackingNumber, status } = req.body || {};
  if (!carrier || !trackingNumber)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const shipment = await db.insertHubShipment(
      req.params.id,
      carrier,
      trackingNumber,
      status || null,
    );
    res.json(shipment);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record shipment" });
  }
});
app.get("/api/admin/spaces", adminCheck, async (_req, res) => {
  try {
    const spaces = await db.listSpaces();
    res.json(spaces);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch spaces" });
  }
});

app.post("/api/admin/spaces", adminCheck, async (req, res) => {
  const { region, costCents, address } = req.body || {};
  try {
    const space = await db.createSpace(region, costCents, address);
    res.json(space);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create space" });
  }
});

app.get("/api/admin/spaces", adminCheck, async (req, res) => {
  try {
    const spaces = await db.listAllSpaces();
    res.json(spaces);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch spaces" });
  }
});

app.post("/api/admin/spaces", adminCheck, async (req, res) => {
  const { region, costCents, address } = req.body || {};
  try {
    const space = await db.createSpace(
      region || null,
      costCents || null,
      address || null,
    );
    res.json(space);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create space" });
  }
});

app.get("/api/admin/spaces", adminCheck, async (req, res) => {
  try {
    const spaces = await db.listSpaces();
    res.json(spaces);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch spaces" });
  }
});

app.post("/api/admin/spaces", adminCheck, async (req, res) => {
  const { region, costCents, address } = req.body || {};
  if (!region || !costCents || !address) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    const space = await db.createSpace(region, costCents, address);
    res.json(space);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create space" });
  }
});

app.get("/api/admin/spaces", adminCheck, async (req, res) => {
  try {
    const spaces = await db.listSpaces();
    res.json(spaces);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch spaces" });
  }
});

app.post("/api/admin/spaces", adminCheck, async (req, res) => {
  const { region, costCents, address } = req.body || {};
  if (!region || !costCents || !address) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    const space = await db.createSpace(region, costCents, address);
    res.json(space);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create space" });
  }
});

app.post("/api/admin/ads/generate", adminCheck, async (req, res) => {
  const { subreddit, context } = req.body || {};
  if (!subreddit) return res.status(400).json({ error: "Missing subreddit" });
  try {
    const copy = await generateAdCopy(subreddit, context || "");
    const dalleUrl =
      process.env.DALLE_API_URL || "http://localhost:5002/generate";
    let image = null;
    try {
      const { data } = await axios.post(dalleUrl, {
        prompt: `ad thumbnail for ${subreddit}`,
      });
      image = data.image;
    } catch (err) {
      logError("Failed to generate image", err);
    }
    const ad = { id: uuidv4(), subreddit, copy, image, status: "pending" };
    generatedAds.push(ad);
    saveGeneratedAds();
    res.json(ad);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to generate ad" });
  }
});

app.get("/api/admin/ads/pending", adminCheck, (req, res) => {
  res.json(generatedAds.filter((a) => a.status === "pending"));
});

function submitToReddit(ad) {
  const apiUrl = process.env.REDDIT_ADS_API_URL;
  const token = process.env.REDDIT_ADS_API_TOKEN;
  if (!apiUrl || !token) return Promise.resolve();
  return axios
    .post(
      `${apiUrl}/ads`,
      { subreddit: ad.subreddit, copy: ad.copy, image: ad.image },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    .catch((err) => logError("Failed to submit ad", err));
}

app.post("/api/admin/ads/:id/approve", adminCheck, async (req, res) => {
  const ad = generatedAds.find((a) => a.id === req.params.id);
  if (!ad) return res.status(404).json({ error: "Not found" });
  ad.status = "approved";
  saveGeneratedAds();
  await submitToReddit(ad);
  res.json(ad);
});

app.post("/api/admin/ads/:id/reject", adminCheck, (req, res) => {
  const ad = generatedAds.find((a) => a.id === req.params.id);
  if (!ad) return res.status(404).json({ error: "Not found" });
  ad.status = "rejected";
  saveGeneratedAds();
  res.json(ad);
});
app.get("/api/admin/subscription-metrics", adminCheck, async (req, res) => {
  try {
    const metrics = await db.getSubscriptionMetrics();
    res.json(metrics);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

app.get("/api/admin/scaling-events", adminCheck, async (req, res) => {
  try {
    const events = await db.getScalingEvents(50);
    res.json(events);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.get("/api/admin/operations", adminCheck, async (req, res) => {
  try {
    const [hubs, metrics, avg] = await Promise.all([
      db.listPrinterHubs(),
      db.getLatestPrinterMetrics(),
      db.getAverageJobCompletionSeconds(),
    ]);
    const metricsMap = {};
    metrics.forEach((m) => {
      metricsMap[m.printer_id] = m;
    });
    const result = [];
    for (const hub of hubs) {
      const printers = await db.getPrintersByHub(hub.id);
      const printerMetrics = printers.map((p) => ({
        serial: p.serial,
        ...(metricsMap[p.id] || {}),
      }));
      const backlog = printerMetrics.reduce(
        (sum, m) => sum + (m.queue_length || 0),
        0,
      );
      const dailyCapacity = avg
        ? Math.round((86400 / avg) * printers.length)
        : null;
      const errors = printerMetrics.filter((m) => m.error);
      result.push({
        id: hub.id,
        name: hub.name,
        backlog,
        dailyCapacity,
        errors,
      });
    }
    res.json({ hubs: result });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch operations" });
  }
});

/**
 * POST /api/create-order
 * Create a Stripe Checkout session
 */
app.post("/api/create-order", authOptional, async (req, res) => {
  const {
    jobId,
    price,
    shippingInfo,
    qty,
    discount,
    discountCode,
    referral,
    etchName,
    useCredit,
  } = req.body;
  try {
    const job = await db.query(
      "SELECT job_id, user_id FROM jobs WHERE job_id=$1",
      [jobId],
    );
    if (job.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    let totalDiscount = discount || 0;
    let discountCodeId = null;
    let referrerId = null;
    if (referral) {
      referrerId = await db.getUserIdForReferral(referral);
    }

    if (discountCode) {
      const row = await getValidDiscountCode(discountCode);
      if (!row) {
        return res.status(400).json({ error: "Invalid discount code" });
      }
      totalDiscount += row.amount_cents;
      discountCodeId = row.id;
    }

    if (
      shippingInfo &&
      shippingInfo.country &&
      prohibitedCountries.includes(String(shippingInfo.country).toUpperCase())
    ) {
      return res
        .status(400)
        .json({ error: "Shipping destination not allowed" });
    }

    if (referrerId && (!req.user || referrerId !== req.user.id)) {
      const refDisc = Math.round((price || 0) * (qty || 1) * 0.1);
      totalDiscount += refDisc;
      try {
        const code = await createTimedCode(refDisc, 720);
        await db.query("INSERT INTO incentives(user_id, type) VALUES($1,$2)", [
          referrerId,
          `referral_${code}`,
        ]);

        const { rows: counts } = await db.query(
          "SELECT COUNT(*) FROM incentives WHERE user_id=$1 AND type LIKE 'referral_%'",
          [referrerId],
        );
        const referralCount = parseInt(counts[0].count, 10) || 0;
        if (referralCount >= 3) {
          const { rows: existing } = await db.query(
            "SELECT 1 FROM incentives WHERE user_id=$1 AND type LIKE 'free_%' LIMIT 1",
            [referrerId],
          );
          if (existing.length === 0) {
            const freeCode = await createTimedCode(
              Math.round((price || 0) * (qty || 1)),
              720,
            );
            await db.query(
              "INSERT INTO incentives(user_id, type) VALUES($1,$2)",
              [referrerId, `free_${freeCode}`],
            );
          }
        }
      } catch (err) {
        logError(err);
      }
    }

    if (useCredit) {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const sub = await db.getSubscription(req.user.id);
      if (!sub || sub.status !== "active") {
        return res.status(400).json({ error: "No active subscription" });
      }
      if ((qty || 1) % 2 !== 0) {
        return res
          .status(400)
          .json({ error: "Credits must be redeemed in pairs" });
      }
      await db.ensureCurrentWeekCredits(req.user.id, 2);
      const credits = await db.getCurrentWeekCredits(req.user.id);
      if (credits.total_credits - credits.used_credits <= 0) {
        return res.status(400).json({ error: "No credits remaining" });
      }
      await db.incrementCreditsUsed(req.user.id, 1);
      const sessionId = uuidv4();
      await db.query(
        "INSERT INTO orders(session_id, job_id, user_id, price_cents, status, shipping_info, quantity, discount_cents, etch_name, product_type, utm_source, utm_medium, utm_campaign, subreddit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
        [
          sessionId,
          jobId,
          req.user.id,
          0,
          "paid",
          shippingInfo || {},
          qty || 1,
          0,
          etchName || null,
          req.body.productType || null,
          req.body.utmSource || null,
          req.body.utmMedium || null,
          req.body.utmCampaign || null,
          req.body.adSubreddit || null,
        ],
      );
      enqueuePrint(jobId);
      processQueue();
      return res.json({ success: true });
    }

    if (req.user) {
      const { rows: paid } = await db.query(
        "SELECT 1 FROM orders WHERE user_id=$1 AND status=$2 LIMIT 1",
        [req.user.id, "paid"],
      );
      if (paid.length === 0) {
        const firstDisc = Math.round((price || 0) * (qty || 1) * 0.1);
        totalDiscount += firstDisc;
        await db.query("INSERT INTO incentives(user_id, type) VALUES($1,$2)", [
          req.user.id,
          "first_order",
        ]);
      }
    }

    if ((qty || 1) >= 2) {
      totalDiscount += Math.round((price || 0) * 0.1);
    }

    const total = (price || 0) * (qty || 1) - totalDiscount;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "3D Model" },
            unit_amount: total,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/payment.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/payment.html?cancel=1`,
      metadata: { jobId },
    });

    await db.query(
      "INSERT INTO orders(session_id, job_id, user_id, price_cents, status, shipping_info, quantity, discount_cents, etch_name, product_type, utm_source, utm_medium, utm_campaign, subreddit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
      [
        session.id,
        jobId,
        req.user ? req.user.id : null,
        total,
        "pending",
        shippingInfo || {},
        qty || 1,
        totalDiscount,
        etchName || null,
        req.body.productType || null,
        req.body.utmSource || null,
        req.body.utmMedium || null,
        req.body.utmCampaign || null,
        req.body.adSubreddit || null,
      ],
    );
    if (referrerId && (!req.user || referrerId !== req.user.id)) {
      await db.insertReferredOrder(session.id, referrerId);
    }

    if (
      req.user &&
      job.rows[0].user_id &&
      job.rows[0].user_id !== req.user.id
    ) {
      const commission = Math.round(total * 0.1);
      await db.insertCommission(
        session.id,
        jobId,
        job.rows[0].user_id,
        req.user.id,
        commission,
      );
    }

    if (discountCodeId) {
      await incrementDiscountUsage(discountCodeId);
    }

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const token = uuidv4();
  try {
    await db.upsertMailingListEntry(email, token);
    const url = `${req.headers.origin}/api/confirm-subscription?token=${token}`;
    await sendMail(email, "Confirm Subscription", `Click to confirm: ${url}`);
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

app.post("/api/competitions/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const token = uuidv4();
  try {
    await db.upsertMailingListEntry(email, token);
    const url = `${req.headers.origin}/api/confirm-subscription?token=${token}`;
    await sendMail(email, "Confirm Subscription", `Click to confirm: ${url}`);
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

app.post("/api/competitions/notify", adminCheck, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const { rows } = await db.query(
      "SELECT email FROM mailing_list WHERE confirmed=TRUE AND unsubscribed=FALSE",
    );
    for (const r of rows) {
      await sendMail(r.email, subject, message);
    }
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

app.get("/api/confirm-subscription", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Invalid token");
  try {
    await db.confirmMailingListEntry(token);
    res.send("Subscription confirmed");
  } catch (err) {
    logError(err);
    res.status(500).send("Failed to confirm");
  }
});

app.get("/api/unsubscribe", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Invalid token");
  try {
    await db.unsubscribeMailingListEntry(token);
    res.send("You have been unsubscribed");
  } catch (err) {
    logError(err);
    res.status(500).send("Failed to unsubscribe");
  }
});

/**
 * POST /api/webhook/sendgrid
 * Handle SendGrid event notifications
 */
app.post("/api/webhook/sendgrid", async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [];
  try {
    for (const evt of events) {
      if (evt.event === "bounce" || evt.event === "spamreport") {
        const email = evt.email;
        if (email) {
          await db.query(
            "UPDATE mailing_list SET unsubscribed=TRUE WHERE email=$1",
            [email],
          );
        }
      }
    }
  } catch (err) {
    logError("Failed to process SendGrid webhook", err);
  }
  res.sendStatus(204);
});

/**
 * POST /api/webhook/stripe
 * Handle Stripe payment confirmation
 */
app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      await db.query('UPDATE orders SET status=$1 WHERE session_id=$2', ['paid', sessionId]);

      const { rows } = await db.query(
        'SELECT job_id, user_id, shipping_info FROM orders WHERE session_id=$1',
        [sessionId],
      );
      const row = rows[0] || {};
      const jobId = sessionJobId || row.job_id;
      const userId = row.user_id;
      const shippingInfo = row.shipping_info;

      if (jobId) {
        let gcodePath = null;
        try {
          const { rows: modelRows } = await db.query(
            'SELECT model_url FROM jobs WHERE job_id=$1',
            [jobId],
          );
          if (modelRows.length && modelRows[0].model_url) {
            gcodePath = await sliceModel(modelRows[0].model_url);
          }
        } catch (err) {
          logError('Failed to slice model', err);
        }
        await enqueueDbPrint(jobId, sessionId, shippingInfo || {}, null, gcodePath);
        enqueuePrint(jobId);
        processQueue();
      }

        const { rows } = await db.query(
          "SELECT job_id, user_id FROM orders WHERE session_id=$1",
          [sessionId],
        );
        const row = rows[0] || {};
        const jobId = sessionJobId || row.job_id;
        const userId = row.user_id;

        if (jobId) {
          enqueuePrint(jobId);
          processQueue();
        }

        if (userId) {
          const { rows: countRows } = await db.query(
            "SELECT COUNT(*) FROM orders WHERE user_id=$1 AND status='paid' AND created_at >= NOW() - INTERVAL '30 days'",
            [userId],
          );
          const count = parseInt(countRows[0].count, 10) || 0;
          if (count >= 3) {
            const month = new Date().toISOString().slice(0, 7);
            const type = `three_orders_${month}`;
            const { rows: existing } = await db.query(
              "SELECT 1 FROM incentives WHERE user_id=$1 AND type=$2",
              [userId, type],
            );
            if (existing.length === 0) {
              await db.query(
                "INSERT INTO incentives(user_id, type) VALUES($1,$2)",
                [userId, type],
              );
            }
          }

          const streak = await db.updateWeeklyOrderStreak(userId);
          if (streak % 4 === 0) {
            const type = `weekly_streak_${streak}`;
            const { rows: existing } = await db.query(
              "SELECT 1 FROM incentives WHERE user_id=$1 AND type=$2",
              [userId, type],
            );
            if (existing.length === 0) {
              await db.query(
                "INSERT INTO incentives(user_id, type) VALUES($1,$2)",
                [userId, type],
              );
            }
          }
        }
      } catch (err) {
        logError(err);
      }
    }
    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      try {
        const userRes = await db.query("SELECT id FROM users WHERE email=$1", [
          sub.customer_email || "",
        ]);
        const userId = userRes.rows[0] && userRes.rows[0].id;
        if (userId) {
          await db.upsertSubscription(
            userId,
            sub.status,
            new Date(sub.current_period_start * 1000)
              .toISOString()
              .slice(0, 10),
            new Date(sub.current_period_end * 1000).toISOString().slice(0, 10),
            sub.customer,
            sub.id,
          );
        }
      } catch (err) {
        logError("Failed to sync subscription", err);
      }
    }
    res.sendStatus(200);
  },
);

app.post('/api/webhook/printer-complete', async (req, res) => {
  const { jobId } = req.body || {};
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  try {
    await db.query("UPDATE print_jobs SET status='complete' WHERE job_id=$1", [jobId]);
    res.sendStatus(204);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/print-jobs/:id', async (req, res) => {
  const { rows } = await db.query('SELECT status FROM print_jobs WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

async function checkCompetitionStart() {
  try {
    const comps = await db.query(
      `SELECT id, name FROM competitions WHERE start_date <= CURRENT_DATE AND start_notification_sent=FALSE`,
    );
    if (comps.rows.length) {
      const recipients = await db.query(
        `SELECT u.email FROM users u JOIN user_profiles p ON u.id=p.user_id WHERE p.competition_notify=TRUE`,
      );
      for (const comp of comps.rows) {
        for (const r of recipients.rows) {
          await sendMail(
            r.email,
            "Voting Open",
            `Voting is now open for competition "${comp.name}".`,
          );
        }
        await db.query(
          "UPDATE competitions SET start_notification_sent=TRUE WHERE id=$1",
          [comp.id],
        );
      }
    }
  } catch (err) {
    logError("Failed to send start notifications", err);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  if (process.env.HTTP2 === "true") {
    const server = http2.createServer({ allowHTTP1: true }, app);
    server.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT} (HTTP/2)`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  }
  initDailyPrintsSold();
  checkCompetitionStart();
  setInterval(checkCompetitionStart, 3600000);
  runScalingEngine().catch((err) => logError("Scaling engine failed", err));
  setInterval(() => {
    runScalingEngine().catch((err) => logError("Scaling engine failed", err));
  }, 3600000);
  syncMailingList().catch((err) => logError("Mail sync failed", err));
  setInterval(
    () => {
      syncMailingList().catch((err) => logError("Mail sync failed", err));
    },
    24 * 3600 * 1000,
  );
}

module.exports = app;
module.exports.checkCompetitionStart = checkCompetitionStart;
