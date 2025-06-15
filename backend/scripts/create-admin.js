require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

(async () => {
  const username = process.env.ADMIN_USERNAME || process.argv[2];
  const password = process.env.ADMIN_PASSWORD || process.argv[3];
  const email = process.env.ADMIN_EMAIL || process.argv[4] || `${username}@example.com`;

  if (!username || !password) {
    console.error('Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD=secret node scripts/create-admin.js');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await client.query('SELECT id FROM users WHERE username=$1', [username]);
    let id;
    if (rows.length) {
      await client.query('UPDATE users SET password_hash=$2, is_admin=TRUE WHERE username=$1', [
        username,
        hash,
      ]);
      id = rows[0].id;
    } else {
      const ins = await client.query(
        'INSERT INTO users(username,email,password_hash,is_admin) VALUES($1,$2,$3,TRUE) RETURNING id',
        [username, email, hash]
      );
      id = ins.rows[0].id;
      await client.query('INSERT INTO user_profiles(user_id) VALUES($1)', [id]);
    }
    console.log(`Admin user ${username} created/updated (id: ${id})`);
  } catch (err) {
    console.error('Failed to create admin user', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
