// backend/db.js
require("dotenv").config();
const { Pool } = require("pg");
const { dbUrl } = require("./config");
const pool = new Pool({ connectionString: dbUrl });

function query(text, params) {
  return pool.query(text, params);
}

async function insertShare(jobId, userId, slug) {
  return query(
    "INSERT INTO shares(job_id, user_id, slug) VALUES($1,$2,$3) RETURNING *",
    [jobId, userId, slug],
  ).then((res) => res.rows[0]);
}

async function getShareBySlug(slug) {
  return query("SELECT * FROM shares WHERE slug=$1", [slug]).then(
    (res) => res.rows[0],
  );
}

async function getShareByJobId(jobId) {
  return query("SELECT * FROM shares WHERE job_id=$1", [jobId]).then(
    (res) => res.rows[0],
  );
}

module.exports = {
  query,
  insertShare,
  getShareBySlug,
  getShareByJobId,
};
