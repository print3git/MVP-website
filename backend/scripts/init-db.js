require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'init.sql'), 'utf8');
    const client = new Client({ connectionString: process.env.DB_URL });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('Database initialized');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
