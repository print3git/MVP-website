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
module.exports = {
  pool,
  close,
  createJob,
  linkModelToJob,
  insertGenerationLog,
};
