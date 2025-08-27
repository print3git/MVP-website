const { Pool } = require("pg");
const { getEnv } = require("./env");

const { DB_URL, NODE_ENV } = getEnv();

const pool = new Pool({ connectionString: DB_URL });

function close() {
  return pool.end();
}

const jobs = new Map();
const generationLogs = [];
const processedPayments = new Map();
const inMemoryOrders = new Map();

async function createJob(input) {
  const id = "j_" + Date.now();
  try {
    await pool.query(
      "INSERT INTO jobs(job_id, user_id, url, title) VALUES($1,$2,$3,$4)",
      [id, input.userId, input.url, input.title],
    );
  } catch {
    if (NODE_ENV !== "production") {
      jobs.set(id, { id, ...input });
    }
  }
  return { id };
}

async function linkModelToJob(jobId, s3Key) {
  try {
    await pool.query("UPDATE jobs SET s3_key=$2 WHERE job_id=$1", [
      jobId,
      s3Key,
    ]);
  } catch {
    if (NODE_ENV !== "production") {
      const job = jobs.get(jobId) || { id: jobId };
      job.s3Key = s3Key;
      jobs.set(jobId, job);
    }
  }
}

async function insertGenerationLog(log) {
  const {
    jobId,
    userId,
    prompt,
    source,
    startTime,
    finishTime,
    s3Key,
    url,
    costCents,
  } = log;
  try {
    await pool.query(
      `INSERT INTO generation_logs(job_id, user_id, prompt, source, start_time, finish_time, s3_key, url, cost_cents)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        jobId,
        userId,
        prompt,
        source,
        startTime,
        finishTime,
        s3Key,
        url,
        costCents,
      ],
    );
  } catch {
    if (process.env.NODE_ENV !== "production") {
      generationLogs.push(log);
    }
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
    jobId,
    s3Key,
  } = input;
  try {
    await pool.query(
      `INSERT INTO orders (order_id, user_id, intent_id, amount_cents, currency, email, quantity, model_url, job_id, s3_key, paid, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW())
       ON CONFLICT (order_id) DO UPDATE SET user_id=$2, intent_id=$3, amount_cents=$4, currency=$5, email=$6, quantity=$7, model_url=$8, job_id=$9, s3_key=$10, paid=true, paid_at=NOW()`,
      [
        orderId || intentId,
        userId,
        intentId,
        amountCents,
        currency,
        email,
        quantity,
        modelUrl,
        jobId,
        s3Key,
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
      job_id: jobId,
      s3_key: s3Key,
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
