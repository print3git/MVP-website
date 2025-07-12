process.env.STRIPE_TEST_KEY = "sk_test";
process.env.STRIPE_LIVE_KEY = "sk_live";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";

jest.mock("../mail", () => ({ sendMail: jest.fn() }));
const { sendMail } = require("../mail");

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = {
  checkout: {
    sessions: {
      create: jest
        .fn()
        .mockResolvedValue({ id: "cs_test", url: "http://checkout" }),
    },
  },
  webhooks: { constructEvent: jest.fn() },
};
Stripe.mockImplementation(() => stripeMock);

const request = require("supertest");
const app = require("../src/app");
const { orders } = require("../src/routes/checkout");

afterEach(() => {
  orders.clear();
  jest.clearAllMocks();
});

test("POST /api/checkout creates session", async () => {
  const res = await request(app)
    .post("/api/checkout")
    .send({ slug: "m1", email: "a@a.com" });
  expect(res.status).toBe(200);
  expect(stripeMock.checkout.sessions.create).toHaveBeenCalled();
  expect(orders.get("cs_test")).toBeDefined();
  expect(res.body.checkoutUrl).toBe("http://checkout");
});

test("POST /api/stripe/webhook marks paid and emails", async () => {
  orders.set("cs_test", { slug: "m1", email: "a@a.com" });
  const payload = JSON.stringify({
    id: "evt",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test" } },
  });
  stripeMock.webhooks.constructEvent.mockReturnValueOnce(JSON.parse(payload));
  const res = await request(app)
    .post("/api/stripe/webhook")
    .set("stripe-signature", "sig")
    .send(payload);
  expect(res.status).toBe(200);
  expect(orders.get("cs_test")?.paid).toBe(true);
  expect(sendMail).toHaveBeenCalled();
});

test("POST /api/checkout validates required fields", async () => {
  const res = await request(app).post("/api/checkout").send({ slug: "m1" });
  expect(res.status).toBe(400);
  expect(orders.size).toBe(0);
});

test("POST /api/stripe/webhook ignores unknown sessions", async () => {
  const payload = JSON.stringify({
    id: "evt",
    type: "checkout.session.completed",
    data: { object: { id: "missing" } },
  });
  stripeMock.webhooks.constructEvent.mockReturnValueOnce(JSON.parse(payload));
  const res = await request(app)
    .post("/api/stripe/webhook")
    .set("stripe-signature", "sig")
    .send(payload);
  expect(res.status).toBe(200);
  expect(sendMail).not.toHaveBeenCalled();
});
