require("dotenv").config();
const { Client } = require("pg");

(async () => {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    await client.query(
      "INSERT INTO jobs(job_id, prompt, status) VALUES('00000000-0000-0000-0000-000000000000','example','complete') ON CONFLICT DO NOTHING",
    );
    await client.query(
      "INSERT INTO orders(session_id, job_id, price_cents, status, quantity) VALUES('seed', '00000000-0000-0000-0000-000000000000', 1000, 'paid', 1) ON CONFLICT DO NOTHING",
    );
    console.log("Seed data inserted");
  } finally {
    await client.end();
  }
})();
