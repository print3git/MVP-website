require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    await client.query(
      "INSERT INTO jobs(job_id, prompt, status) VALUES('00000000-0000-0000-0000-000000000000','example','complete') ON CONFLICT DO NOTHING"
    );
    await client.query(
      "INSERT INTO orders(session_id, job_id, price_cents, status, quantity) VALUES('seed', '00000000-0000-0000-0000-000000000000', 1000, 'paid', 1) ON CONFLICT DO NOTHING"
    );
    await client.query(
      'INSERT INTO user_profiles(user_id, display_name, shipping, payment) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      ['00000000-0000-0000-0000-000000000000', 'Example', {}, {}]
    );
    await client.query(
      'INSERT INTO community_creations(job_id, title, category, user_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [
        '00000000-0000-0000-0000-000000000000',
        'Example Model',
        'demo',
        '00000000-0000-0000-0000-000000000000',
      ]
    );
    await client.query(
      'INSERT INTO community_creations(job_id, title, category, user_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [
        '00000000-0000-0000-0000-000000000000',
        'Another Model',
        'demo',
        '00000000-0000-0000-0000-000000000000',
      ]
    );
    await client.query(
      `INSERT INTO gifts(order_id, sender_id, recipient_email, message, model_id, claim_token)
       VALUES('seed', '00000000-0000-0000-0000-000000000000', 'test@example.com', 'Enjoy!', '00000000-0000-0000-0000-000000000000', 'seed-token')
       ON CONFLICT DO NOTHING`
    );
    // Seed data inserted
  } finally {
    await client.end();
  }
})();
