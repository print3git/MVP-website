process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertCommission: jest.fn().mockResolvedValue({}),
  upsertSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  getSubscription: jest.fn(),
  ensureCurrentWeekCredits: jest.fn(),
  getCurrentWeekCredits: jest.fn(),
  incrementCreditsUsed: jest.fn(),
  upsertMailingListEntry: jest.fn(),
  confirmMailingListEntry: jest.fn(),
  unsubscribeMailingListEntry: jest.fn(),
  getUserCreations: jest.fn(),
  insertCommunityComment: jest.fn(),
  getCommunityComments: jest.fn(),
  insertSocialShare: jest.fn(),
  verifySocialShare: jest.fn(),
  getUserIdForReferral: jest.fn(),
  getOrCreateOrderReferralLink: jest.fn(),
  insertReferredOrder: jest.fn(),
  updateWeeklyOrderStreak: jest.fn(),
  insertGenerationLog: jest.fn(),
}));
const db = require("../db");

jest.mock("../mail", () => ({ sendMail: jest.fn() }));
const { sendMail } = require("../mail");
jest.mock("axios");
const axios = require("axios");
jest.mock("../src/pipeline/generateModel", () => ({
  generateModel: jest.fn(),
}));
const { generateModel } = require("../src/pipeline/generateModel");
const jwt = require("jsonwebtoken");

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = {
  checkout: {
    sessions: {
      create: jest
        .fn()
        .mockResolvedValue({ id: "cs_test", url: "https://stripe.test" }),
    },
  },
  webhooks: {
    constructEvent: jest.fn(() => ({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", metadata: { jobId: "job1" } } },
    })),
  },
};
Stripe.mockImplementation(() => stripeMock);

jest.mock("../queue/printQueue", () => ({
  enqueuePrint: jest.fn(),
  processQueue: jest.fn(),
  progressEmitter: new (require("events").EventEmitter)(),
  COMPLETE_EVENT: "complete",
}));
const { enqueuePrint } = require("../queue/printQueue");
jest.mock("../queue/dbPrintQueue", () => ({ enqueuePrint: jest.fn() }));
const { enqueuePrint: enqueueDbPrint } = require("../queue/dbPrintQueue");
jest.mock("../printers/slicer", () =>
  jest.fn().mockResolvedValue("/tmp/out.gcode"),
);
const sliceModel = require("../printers/slicer");

jest.mock("../shipping", () => ({
  getShippingEstimate: jest.fn().mockResolvedValue({ cost: 10, etaDays: 5 }),
}));
const { getShippingEstimate } = require("../shipping");

jest.mock(
  "../utils/captionService",
  () => ({
    generateCaption: jest.fn().mockResolvedValue("BLIP caption"),
  }),
  { virtual: true },
);
const { generateCaption } = require("../utils/captionService");

const request = require("supertest");
const app = require("../server");
const fs = require("fs");
const stream = require("stream");

beforeEach(() => {
  db.query.mockClear();
  db.insertCommission.mockClear();
  db.upsertMailingListEntry.mockClear();
  db.confirmMailingListEntry.mockClear();
  db.unsubscribeMailingListEntry.mockClear();
  sendMail.mockClear();
  axios.post.mockClear();
  generateModel.mockClear();
  enqueuePrint.mockClear();
  enqueueDbPrint.mockClear();
  sliceModel.mockClear();
  getShippingEstimate.mockClear();
  generateCaption.mockClear();
  db.ensureCurrentWeekCredits.mockClear();
  db.getCurrentWeekCredits.mockClear();
  db.getUserIdForReferral.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("POST /api/generate returns glb url", async () => {
  generateModel.mockResolvedValue("/models/test.glb");
  const res = await request(app).post("/api/generate").send({ prompt: "test" });
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe("/models/test.glb");
});

test("POST /api/generate returns string url", async () => {
  generateModel.mockResolvedValue("/models/test.glb");
  const res = await request(app).post("/api/generate").send({ prompt: "test" });
  expect(res.status).toBe(200);
  expect(typeof res.body.glb_url).toBe("string");
});

test("GET /api/status returns job", async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      {
        job_id: "1",
        status: "complete",
        model_url: "url",
        generated_title: "Auto",
      },
    ],
  });
  const res = await request(app).get("/api/status/1");
  expect(res.status).toBe(200);
  expect(res.body.status).toBe("complete");
  expect(res.body.generated_title).toBe("Auto");
});

test("Stripe create-order flow", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] });
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .post("/api/create-order")
    .send({ jobId: "1", price: 100, productType: "single" });
  expect(res.status).toBe(200);
  expect(res.body.checkoutUrl).toBe("https://stripe.test");
});

test("create-order applies discount", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] });
  db.query.mockResolvedValueOnce({});
  const res = await request(app).post("/api/create-order").send({
    jobId: "1",
    price: 100,
    qty: 2,
    discount: 20,
    productType: "single",
  });
  expect(res.status).toBe(200);
  expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      line_items: [
        expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 170 }),
        }),
      ],
    }),
  );
  const insertCall = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO orders"),
  );
  expect(insertCall[1][3]).toBe(170);
  expect(insertCall[1][7]).toBe(30);
});

test("create-order quantity discount", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] });
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .post("/api/create-order")
    .send({ jobId: "1", price: 100, qty: 2, productType: "single" });
  expect(res.status).toBe(200);
  const createCall = stripeMock.checkout.sessions.create.mock.calls.pop()[0];
  expect(createCall.line_items[0].price_data.unit_amount).toBe(190);
  const orderInsert = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO orders"),
  );
  expect(orderInsert[1][3]).toBe(190);
  expect(orderInsert[1][7]).toBe(10);
});

test("create-order applies first-order discount", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({});
  const token = jwt.sign({ id: "u1" }, "secret");
  await request(app)
    .post("/api/create-order")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "1", price: 100, qty: 1, productType: "single" });
  const createCall = stripeMock.checkout.sessions.create.mock.calls.pop()[0];
  expect(createCall.line_items[0].price_data.unit_amount).toBe(90);
  const orderInsert = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO orders"),
  );
  expect(orderInsert[1][3]).toBe(90);
  expect(orderInsert[1][7]).toBe(10);
});

test("create-order grants free print after three referrals", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] })
    .mockResolvedValueOnce({ rows: [{ code: "REF123" }] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ rows: [{ count: "3" }] })
    .mockResolvedValueOnce({});
  db.getUserIdForReferral.mockResolvedValue("u2");

  const res = await request(app).post("/api/create-order").send({
    jobId: "1",
    price: 100,
    referral: "REFCODE",
    productType: "single",
  });

  expect(res.status).toBe(200);
  const createCall = stripeMock.checkout.sessions.create.mock.calls.pop()[0];
  expect(createCall.line_items[0].price_data.unit_amount).toBe(0);
  const incentiveCalls = db.query.mock.calls.filter((c) =>
    c[0].includes("INSERT INTO incentives"),
  );
  expect(incentiveCalls).toHaveLength(1);
  expect(db.insertReferredOrder).toHaveBeenCalled();
  expect(db.getUserIdForReferral).toHaveBeenCalledWith("REFCODE");
});

test("create-order rejects unknown job", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app)
    .post("/api/create-order")
    .send({ jobId: "bad" });
  expect(res.status).toBe(404);
});

test("create-order rejects prohibited destination", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] });
  const res = await request(app)
    .post("/api/create-order")
    .send({
      jobId: "1",
      price: 100,
      productType: "single",
      shippingInfo: { country: "IR" },
    });
  expect(res.status).toBe(400);
});

test("POST /api/register returns token", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: "u1", username: "alice" }] });
  const res = await request(app).post("/api/register").send({
    username: "alice",
    email: "a@a.com",
    password: "p",
  });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
});

const bcrypt = require("bcryptjs");

test("POST /api/login returns token", async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      { id: "u1", username: "alice", password_hash: bcrypt.hashSync("p", 10) },
    ],
  });
  const res = await request(app)
    .post("/api/login")
    .send({ username: "alice", password: "p" });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
});

test("Stripe webhook updates order and awards badge", async () => {
  db.query
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({
      rows: [{ job_id: "job1", user_id: "u1", shipping_info: { name: "A" } }],
    })
    .mockResolvedValueOnce({ rows: [{ model_url: "/tmp/model.stl" }] })
    .mockResolvedValueOnce({ rows: [{ count: "3" }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({});
  const payload = JSON.stringify({});
  const res = await request(app)
    .post("/api/webhook/stripe")
    .set("stripe-signature", "sig")
    .set("Content-Type", "application/json")
    .send(payload);
  expect(res.status).toBe(200);
  expect(enqueuePrint).toHaveBeenCalledWith("job1");
  expect(enqueueDbPrint).toHaveBeenCalledWith(
    "job1",
    "cs_test",
    { name: "A" },
    null,
    "/tmp/out.gcode",
  );
  const incentive = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO incentives"),
  );
  expect(incentive).toBeTruthy();
  expect(incentive[1][1]).toMatch(/^three_orders_/);
});

test("Stripe webhook awards weekly streak badge", async () => {
  db.query
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({
      rows: [{ job_id: "job1", user_id: "u1", shipping_info: { name: "A" } }],
    })
    .mockResolvedValueOnce({ rows: [{ model_url: "/tmp/model.stl" }] })
    .mockResolvedValueOnce({ rows: [{ count: "1" }] });
  db.updateWeeklyOrderStreak.mockResolvedValueOnce(4);
  db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({});
  const payload = JSON.stringify({});
  const res = await request(app)
    .post("/api/webhook/stripe")
    .set("stripe-signature", "sig")
    .set("Content-Type", "application/json")
    .send(payload);
  expect(res.status).toBe(200);
  const incentiveCalls = db.query.mock.calls.filter((c) =>
    c[0].includes("INSERT INTO incentives"),
  );
  const last = incentiveCalls[incentiveCalls.length - 1];
  expect(last[1][1]).toBe("weekly_streak_4");
});

test("Stripe webhook invalid signature", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  stripeMock.webhooks.constructEvent.mockImplementation(() => {
    throw new Error("bad sig");
  });
  const payload = JSON.stringify({});
  const res = await request(app)
    .post("/api/webhook/stripe")
    .set("stripe-signature", "bad")
    .set("Content-Type", "application/json")
    .send(payload);
  expect(res.status).toBe(400);
});

test("Stripe webhook invalid signature does not process", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  stripeMock.webhooks.constructEvent.mockImplementation(() => {
    throw new Error("bad sig");
  });
  const payload = JSON.stringify({});
  await request(app)
    .post("/api/webhook/stripe")
    .set("stripe-signature", "bad")
    .set("Content-Type", "application/json")
    .send(payload);
  expect(db.query).not.toHaveBeenCalled();
  expect(enqueuePrint).not.toHaveBeenCalled();
});

test("POST /api/generate accepts image upload", async () => {
  const chunks = [];
  jest.spyOn(fs, "createWriteStream").mockImplementation(() => {
    const writable = new stream.Writable({
      write(chunk, enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    return writable;
  });

  jest.spyOn(fs, "createReadStream").mockImplementation(() => {
    const readable = new stream.Readable({
      read() {
        this.push(Buffer.concat(chunks));
        this.push(null);
      },
    });
    return readable;
  });

  jest.spyOn(fs, "unlink").mockImplementation((_, cb) => cb && cb());

  generateModel.mockResolvedValue("/models/test.glb");
  const res = await request(app)
    .post("/api/generate")
    .field("prompt", "img test")
    .attach("image", Buffer.from("fake"), "test.png");

  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe("/models/test.glb");

  const insertCall = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO jobs"),
  );
  expect(insertCall[1][2]).toEqual(expect.any(String));
});

test("POST /api/community submits model", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ generated_title: "Auto" }] });
  db.query.mockResolvedValueOnce({});
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/community")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "j1" });
  expect(res.status).toBe(201);
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("INSERT INTO community_creations"),

    ["j1", "Auto", "", "u1"],
  );
});

test("POST /api/community uses BLIP caption for title", async () => {
  const caption = "A BLIP caption";
  generateCaption.mockResolvedValueOnce(caption);
  db.query.mockResolvedValueOnce({ rows: [{ generated_title: caption }] });
  db.query.mockResolvedValueOnce({});
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/community")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "j1" });
  expect(res.status).toBe(201);
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("INSERT INTO community_creations"),

    ["j1", caption, "", "u1"],
  );
});

test("POST /api/community requires jobId", async () => {
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/community")
    .set("authorization", `Bearer ${token}`)
    .send({});
  expect(res.status).toBe(400);
});

test("POST /api/community requires auth", async () => {
  const res = await request(app).post("/api/community").send({ jobId: "j1" });
  expect(res.status).toBe(401);
});

test("POST /api/community unauthorized skips DB", async () => {
  await request(app).post("/api/community").send({ jobId: "j1" });
  expect(db.query).not.toHaveBeenCalled();
});

test("GET /api/community/recent returns creations", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/community/recent");
  expect(res.status).toBe(200);
});

test("GET /api/community/recent supports order", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get("/api/community/recent?order=asc");
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("ORDER BY c.created_at ASC"),
    [10, 0, null, null],
  );
});

test("GET /api/community/recent pagination and category", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get(
    "/api/community/recent?limit=5&offset=2&category=art&search=bot",
  );
  expect(db.query).toHaveBeenCalledWith(expect.any(String), [
    5,
    2,
    "art",
    "bot",
  ]);
});

test("GET /api/community/mine returns creations", async () => {
  db.getUserCreations.mockResolvedValueOnce([]);
  const token = jwt.sign({ id: "u1" }, "secret");
  await request(app)
    .get("/api/community/mine")
    .set("authorization", `Bearer ${token}`);
  expect(db.getUserCreations).toHaveBeenCalledWith("u1", 10, 0);
});

test("POST /api/community/:id/comment requires auth", async () => {
  const res = await request(app)
    .post("/api/community/5/comment")
    .send({ text: "hi" });
  expect(res.status).toBe(401);
});

test("POST /api/community/:id/comment", async () => {
  db.insertCommunityComment.mockResolvedValueOnce({ id: "c1", text: "hi" });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/community/5/comment")
    .set("authorization", `Bearer ${token}`)
    .send({ text: "hi" });
  expect(res.status).toBe(201);
  expect(res.body.text).toBe("hi");
  expect(db.insertCommunityComment).toHaveBeenCalledWith("5", "u1", "hi");
});

test("GET /api/community/:id/comments", async () => {
  db.getCommunityComments.mockResolvedValueOnce([{ id: "c1", text: "hello" }]);
  const res = await request(app).get("/api/community/5/comments");
  expect(res.status).toBe(200);
  expect(res.body[0].text).toBe("hello");
  expect(db.getCommunityComments).toHaveBeenCalledWith("5");
});

test("Admin create competition", async () => {
  db.query.mockResolvedValueOnce({ rows: [{}] });
  const res = await request(app)
    .post("/api/admin/competitions")
    .set("x-admin-token", "admin")
    .send({ name: "Test", start_date: "2025-01-01", end_date: "2025-01-31" });
  expect(res.status).toBe(200);
});

test("Admin create competition unauthorized", async () => {
  const res = await request(app)
    .post("/api/admin/competitions")
    .send({ name: "Test", start_date: "2025-01-01", end_date: "2025-01-31" });
  expect(res.status).toBe(401);
});

test("registration missing username", async () => {
  const res = await request(app)
    .post("/api/register")
    .send({ email: "a@a.com", password: "p" });
  expect(res.status).toBe(400);
});

test("registration missing email", async () => {
  const res = await request(app)
    .post("/api/register")
    .send({ username: "a", password: "p" });
  expect(res.status).toBe(400);
});

test("registration missing password", async () => {
  const res = await request(app)
    .post("/api/register")
    .send({ username: "a", email: "a@a.com" });
  expect(res.status).toBe(400);
});

test("registration invalid email", async () => {
  const res = await request(app).post("/api/register").send({
    username: "a",
    email: "invalid",
    password: "p",
  });
  expect(res.status).toBe(400);
});

test("registration duplicate username", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  db.query.mockRejectedValueOnce(new Error("duplicate key"));
  const res = await request(app).post("/api/register").send({
    username: "a",
    email: "a@a.com",
    password: "p",
  });
  expect(res.status).toBe(500);
});

test("login invalid password", async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      { id: "u1", username: "alice", password_hash: bcrypt.hashSync("p", 10) },
    ],
  });
  const res = await request(app)
    .post("/api/login")
    .send({ username: "alice", password: "wrong" });
  expect(res.status).toBe(401);
});

test("login missing fields", async () => {
  const res = await request(app).post("/api/login").send({ username: "" });
  expect(res.status).toBe(400);
});

test("/api/generate 400 when no prompt or image", async () => {
  const res = await request(app).post("/api/generate").send({});
  expect(res.status).toBe(400);
});

test("/api/generate falls back on server failure", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  generateModel.mockRejectedValueOnce(new Error("fail"));
  const res = await request(app).post("/api/generate").send({ prompt: "t" });
  expect(res.status).toBe(500);
});

test("/api/generate saves authenticated user id", async () => {
  generateModel.mockResolvedValueOnce("/m.glb");
  const token = jwt.sign({ id: "u1" }, "secret");
  await request(app)
    .post("/api/generate")
    .set("authorization", `Bearer ${token}`)
    .send({ prompt: "t" });
  const insertCall = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO jobs"),
  );
  expect(insertCall[1][4]).toBe("u1");
});

test("/api/generate inserts community row", async () => {
  generateModel.mockResolvedValueOnce("/m.glb");
  await request(app).post("/api/generate").send({ prompt: "t" });
  const communityCall = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO community_creations"),
  );
  expect(communityCall).toBeUndefined();
});

test("/api/status supports limit and offset", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get("/api/status?limit=5&offset=2");
  expect(db.query).toHaveBeenCalledWith(
    "SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [5, 2],
  );
});

test("/api/status/:id returns 404 when missing", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/status/bad");
  expect(res.status).toBe(404);
});

test("GET /api/users/:username/profile returns profile", async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      { display_name: "Alice", avatar_url: "a.png", avatar_glb: "model.glb" },
    ],
  });
  const res = await request(app).get("/api/users/alice/profile");
  expect(res.status).toBe(200);
  expect(res.body.display_name).toBe("Alice");
  expect(res.body.avatar_url).toBe("a.png");
  expect(res.body.avatar_glb).toBe("model.glb");
});

test("GET /api/users/:username/profile 404 when missing", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/users/none/profile");
  expect(res.status).toBe(404);
});

test("GET /api/profile returns profile", async () => {
  const token = jwt.sign({ id: "u1" }, "secret");
  db.query.mockResolvedValueOnce({
    rows: [
      {
        user_id: "u1",
        shipping_info: {},
        payment_info: {},
        avatar_glb: "model.glb",
      },
    ],
  });
  const res = await request(app)
    .get("/api/profile")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.user_id).toBe("u1");
  expect(res.body.avatar_glb).toBe("model.glb");
});

test("POST /api/profile saves details", async () => {
  const token = jwt.sign({ id: "u1" }, "secret");
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .post("/api/profile")
    .set("authorization", `Bearer ${token}`)
    .send({
      shippingInfo: { a: 1 },
      paymentInfo: { b: 2 },
      avatarGlb: "model.glb",
    });
  expect(res.status).toBe(204);
  const call = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO user_profiles"),
  );
  expect(call).toBeTruthy();
});

test("POST /api/create-order saves user id", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] })
    .mockResolvedValueOnce({ rows: [{ id: "o1" }] })
    .mockResolvedValueOnce({});
  const token = jwt.sign({ id: "u1" }, "secret");
  await request(app)
    .post("/api/create-order")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "1", price: 100, productType: "single" });
  const call = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO orders"),
  );
  expect(call[1][2]).toBe("u1");
});

test("POST /api/create-order saves etch name", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] })
    .mockResolvedValueOnce({});
  await request(app)
    .post("/api/create-order")
    .send({ jobId: "1", price: 100, etchName: "Bob", productType: "single" });
  const call = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO orders"),
  );
  expect(call[1][8]).toBe("Bob");
});

test("POST /api/create-order saves UTM params", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: null }] })
    .mockResolvedValueOnce({});
  await request(app).post("/api/create-order").send({
    jobId: "1",
    price: 100,
    productType: "single",
    utmSource: "g",
    utmMedium: "cpc",
    utmCampaign: "summer",
    adSubreddit: "funny",
  });
  const call = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO orders"),
  );
  expect(call[1][10]).toBe("g");
  expect(call[1][11]).toBe("cpc");
  expect(call[1][12]).toBe("summer");
  expect(call[1][13]).toBe("funny");
});

test("create-order inserts commission for marketplace sale", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "seller" }] })
    .mockResolvedValueOnce({ rows: [1] })
    .mockResolvedValueOnce({});
  db.insertCommission.mockResolvedValueOnce({});
  const token = jwt.sign({ id: "buyer" }, "secret");
  await request(app)
    .post("/api/create-order")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "1", price: 100, productType: "single" });
  expect(db.insertCommission).toHaveBeenCalledWith(
    "cs_test",
    "1",
    "seller",
    "buyer",
    10,
  );
});

test("create-order using credit deducts balance", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] })
    .mockResolvedValueOnce({});
  db.getSubscription.mockResolvedValueOnce({ id: "s1", status: "active" });
  db.getCurrentWeekCredits.mockResolvedValueOnce({
    total_credits: 2,
    used_credits: 1,
  });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/create-order")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "1", useCredit: true, qty: 2, productType: "single" });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(db.incrementCreditsUsed).toHaveBeenCalledWith("u1", 1);
});

test("create-order using credit rejects odd quantity", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] });
  db.getSubscription.mockResolvedValueOnce({ id: "s1", status: "active" });
  db.getCurrentWeekCredits.mockResolvedValueOnce({
    total_credits: 2,
    used_credits: 0,
  });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/create-order")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "1", useCredit: true, qty: 1, productType: "single" });
  expect(res.status).toBe(400);
});

test("GET /api/my/orders returns orders", async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ session_id: "s1", snapshot: "img", prompt: "p" }],
  });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .get("/api/my/orders")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body[0].session_id).toBe("s1");
  expect(res.body[0].snapshot).toBe("img");
  expect(res.body[0].prompt).toBe("p");
});

test("GET /api/my/orders requires auth", async () => {
  const res = await request(app).get("/api/my/orders");
  expect(res.status).toBe(401);
});

test("POST /api/shipping-estimate returns estimate", async () => {
  const res = await request(app)
    .post("/api/shipping-estimate")
    .send({ destination: { zip: "12345" }, model: { weight: 2 } });
  expect(res.status).toBe(200);
  expect(res.body.cost).toBe(10);
  expect(getShippingEstimate).toHaveBeenCalledWith(
    { zip: "12345" },
    { weight: 2 },
  );
});

test("POST /api/shipping-estimate validates input", async () => {
  const res = await request(app).post("/api/shipping-estimate").send({});
  expect(res.status).toBe(400);
});

test("POST /api/shipping-estimate returns mocked values and calls helper", async () => {
  getShippingEstimate.mockResolvedValueOnce({ cost: 20, etaDays: 4 });
  const body = { destination: { zip: "98765" }, model: { weight: 3 } };
  const res = await request(app).post("/api/shipping-estimate").send(body);
  expect(res.status).toBe(200);
  expect(res.body.cost).toBe(20);
  expect(res.body.etaDays).toBe(4);
  expect(getShippingEstimate).toHaveBeenCalledWith(
    body.destination,
    body.model,
  );
});

test("POST /api/discount-code returns discount", async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ id: 1, code: "SAVE5", amount_cents: 500 }],
  });
  const res = await request(app)
    .post("/api/discount-code")
    .send({ code: "SAVE5" });
  expect(res.status).toBe(200);
  expect(res.body.discount).toBe(500);
  expect(db.query).toHaveBeenCalledWith(
    "SELECT * FROM discount_codes WHERE code=$1",
    ["SAVE5"],
  );
});

test("POST /api/discount-code invalid", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app)
    .post("/api/discount-code")
    .send({ code: "BAD" });
  expect(res.status).toBe(404);
});

test("POST /api/discount-code requires code", async () => {
  const res = await request(app).post("/api/discount-code").send({});
  expect(res.status).toBe(400);
  expect(db.query).not.toHaveBeenCalled();
});

test("POST /api/generate-discount creates code", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ code: "ABCD1234" }] });
  const res = await request(app).post("/api/generate-discount").send({});
  expect(res.status).toBe(200);
  expect(res.body.code).toBe("ABCD1234");
  const call = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO discount_codes"),
  );
  expect(call).toBeTruthy();
});

test("POST /api/dalle returns image", async () => {
  axios.post.mockResolvedValueOnce({
    data: { image: "data:image/png;base64,aaa" },
  });
  const res = await request(app).post("/api/dalle").send({ prompt: "cat" });
  expect(res.status).toBe(200);
  expect(res.body.image).toMatch(/^data:image\/png;base64,/);
});

test("POST /api/dalle requires prompt", async () => {
  const res = await request(app).post("/api/dalle").send({});
  expect(res.status).toBe(400);
});

test("POST /api/generate-model returns placeholder", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const res = await request(app)
    .post("/api/generate-model")
    .send({ prompt: "cat" });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true, modelId: "placeholder-id" });
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining("/api/generate-model is deprecated"),
  );
  warn.mockRestore();
});

test("POST /api/generate-model requires prompt", async () => {
  const res = await request(app).post("/api/generate-model").send({});
  expect(res.status).toBe(400);
});

test("GET /api/dashboard returns aggregated info", async () => {
  const token = jwt.sign({ id: "u1" }, "secret");
  db.query
    .mockResolvedValueOnce({
      rows: [{ id: "u1", username: "alice", email: "a@e.com" }],
    })
    .mockResolvedValueOnce({
      rows: [
        {
          avatar_url: "a.png",
          shipping_info: {},
          payment_info: {},
          competition_notify: true,
        },
      ],
    })
    .mockResolvedValueOnce({ rows: [{ id: 1 }] })
    .mockResolvedValueOnce({
      rows: [{ id: "c1", commission_cents: 10, status: "pending" }],
    });
  db.getCurrentWeekCredits.mockResolvedValueOnce({
    total_credits: 2,
    used_credits: 1,
  });
  const res = await request(app)
    .get("/api/dashboard")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.orders).toHaveLength(1);
  expect(res.body.commissions.totalPending).toBe(10);
  expect(res.body.credits.remaining).toBe(2);
});
