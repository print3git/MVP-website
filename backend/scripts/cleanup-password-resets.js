require('dotenv').config();
const { Client } = require('pg');

async function cleanupExpiredTokens() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rowCount } = await client.query('DELETE FROM password_resets WHERE expires_at < NOW()');
    if (rowCount && rowCount > 0) {
      console.log(`Deleted ${rowCount} expired password reset tokens`);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  cleanupExpiredTokens().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = cleanupExpiredTokens;
