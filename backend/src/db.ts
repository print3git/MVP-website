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
