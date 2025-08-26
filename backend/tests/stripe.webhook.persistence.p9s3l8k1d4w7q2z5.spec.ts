process.env.STRIPE_SECRET_KEY = "sk_test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.DB_URL = "postgres://user:pass@localhost/test";

import request from "supertest";
import { newDb } from "pg-mem";

const db = newDb({ autoCreateForeignKeyIndices: true });
db.public.none(`
  CREATE TABLE processed_payments(intent_id TEXT PRIMARY KEY);
  CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    user_id TEXT,
    intent_id TEXT,
    amount_cents INTEGER,
    currency TEXT,
    email TEXT,
    quantity INTEGER,
    model_url TEXT,
    job_id TEXT,
    s3_key TEXT,
    paid BOOLEAN,
    paid_at TIMESTAMPTZ
  );
  CREATE TABLE jobs (job_id TEXT PRIMARY KEY, s3_key TEXT);
`);

const pg = db.adapters.createPg();
jest.mock("pg", () => pg);

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = { webhooks: { constructEvent: jest.fn() } };
(Stripe as jest.Mock).mockImplementation(() => stripeMock);

const { app } = require("../src/app");
const { pool } = require("../src/db");

afterAll(async () => {
  await pool.end();
});

test("persists order to db", async () => {
  const event: Stripe.Event = {
    id: "evt_1",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_1",
        amount: 5000,
        currency: "usd",
        metadata: {
          userId: "u1",
          orderId: "o1",
          qty: "2",
          modelUrl: "https://files/model.glb",
          jobId: "j1",
          s3Key: "models/model.glb",
        },
        charges: { data: [{ receipt_email: "e@example.com" }] },
      },
    },
    object: "event",
    api_version: null,
    created: 0,
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as any;
  stripeMock.webhooks.constructEvent.mockReturnValueOnce(event);
  await request(app)
    .post("/api/stripe/webhook")
    .set("stripe-signature", "sig")
    .send("{}")
    .expect(200);
  const { rows } = await pool.query("SELECT * FROM orders");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    order_id: "o1",
    user_id: "u1",
    intent_id: "pi_1",
    amount_cents: 5000,
    currency: "usd",
    job_id: "j1",
    s3_key: "models/model.glb",
  });
});
