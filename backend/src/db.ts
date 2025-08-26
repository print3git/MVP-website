import { Pool } from "pg";

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  throw new Error("DB_URL is required");
}

export const pool = new Pool({ connectionString: dbUrl });

export function close(): Promise<void> {
  return pool.end();
}

const jobs = new Map<string, any>();
const generationLogs: any[] = [];

export async function createJob(input: {
  userId?: string;
  url: string;
  title?: string;
}): Promise<{ id: string }> {
  const id = "j_" + Date.now();
  if (process.env.NODE_ENV !== "production") {
    jobs.set(id, { id, ...input });
  }
  return { id };
}

export async function linkModelToJob(jobId: string, s3Key: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    const job = jobs.get(jobId);
    if (job) {
      job.s3Key = s3Key;
      jobs.set(jobId, job);
    }
  }
}

export async function insertGenerationLog(log: {
  jobId?: string;
  userId?: string;
  prompt?: string;
  source?: "prompt" | "image";
  startTime?: string;
  finishTime?: string;
  s3Key?: string;
  url?: string;
  costCents?: number;
}): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    generationLogs.push(log);
  }
}

const processedPayments = new Map<string, true>();
const inMemoryOrders = new Map<string, any>();

export async function markPaymentProcessed(intentId: string): Promise<boolean> {
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

export async function upsertOrderPaid(input: {
  orderId?: string;
  userId?: string;
  intentId: string;
  amountCents: number;
  currency: string;
  email?: string;
  quantity?: number;
  modelUrl?: string;
}): Promise<void> {
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
      [orderId || intentId, userId, intentId, amountCents, currency, email, quantity, modelUrl],
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
