const { Pool } = require("pg");

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  throw new Error("DB_URL is required");
}

const pool = new Pool({ connectionString: dbUrl });

function close() {
  return pool.end();
}

const jobs = new Map();
const generationLogs = [];
const processedPayments = new Map();
const inMemoryOrders = new Map();

async function createJob(input) {
  const id = "j_" + Date.now();
  if (process.env.NODE_ENV !== "production") {
    jobs.set(id, { id, ...input });
  }
  return { id };
}

async function linkModelToJob(jobId, s3Key) {
  if (process.env.NODE_ENV !== "production") {
    const job = jobs.get(jobId);
    if (job) {
      job.s3Key = s3Key;
      jobs.set(jobId, job);
    }
  }
}

async function insertGenerationLog(log) {
  if (process.env.NODE_ENV !== "production") {
    generationLogs.push(log);
  }
}

async function markPaymentProcessed(intentId) {
  try {
    const result = await pool.query(
      "INSERT INTO processed_payments(intent_id) VALUES($1) ON CONFLICT (intent_id) DO NOTHING RETURNING intent_id",
      [intentId],
    );
    if (result.rowCount && result.rowCount > 0) {
      return true;
    }
    return false;
  } catch {
    if (processedPayments.has(intentId)) {
      return false;
    }
    processedPayments.set(intentId, true);
    return true;
  }
}

async function upsertOrderPaid(input) {
  const {
    orderId,
    userId,
    intentId,
    amountCents,
    currency,
    email,
    quantity,
    modelUrl,
  } = input;
  try {
    await pool.query(
      `INSERT INTO orders (order_id, user_id, intent_id, amount_cents, currency, email, quantity, model_url, paid, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW())
       ON CONFLICT (order_id) DO UPDATE SET user_id=$2, intent_id=$3, amount_cents=$4, currency=$5, email=$6, quantity=$7, model_url=$8, paid=true, paid_at=NOW()`,
      [
        orderId || intentId,
        userId,
        intentId,
        amountCents,
        currency,
        email,
        quantity,
        modelUrl,
      ],
    );
  } catch {
    const key = orderId || intentId;
    inMemoryOrders.set(key, {
      user_id: userId,
      order_id: orderId,
      intent_id: intentId,
      amount_cents: amountCents,
      currency,
      email,
      quantity,
      model_url: modelUrl,
      paid: true,
      paid_at: new Date().toISOString(),
    });
  }
}
module.exports = {
  pool,
  close,
  createJob,
  linkModelToJob,
  insertGenerationLog,
  markPaymentProcessed,
  upsertOrderPaid,
};
