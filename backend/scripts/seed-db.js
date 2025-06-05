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
    await client.query(
      "INSERT INTO user_profiles(user_id, display_name, shipping, payment) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      ["00000000-0000-0000-0000-000000000000", "Example", {}, {}],
    );
    await client.query(
      "INSERT INTO community_creations(job_id, title, category) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      ["00000000-0000-0000-0000-000000000000", "Example Model", "demo"],
    );
    await client.query(
      "INSERT INTO community_creations(job_id, title, category) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      ["00000000-0000-0000-0000-000000000000", "Another Model", "demo"],
    );
    // Seed data inserted
  } finally {
    await client.end();
  }
})();
