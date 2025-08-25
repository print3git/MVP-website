const { config } = require("dotenv");
const { pool, close } = require("../src/db");

config();

async function check() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("✅ database OK");
  } finally {
    client.release();
  }
}

module.exports = { check };

if (require.main === module) {
  check()
    .then(() => close())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Unable to connect to database");
      console.error(err.message);
      close().then(() => process.exit(1));
    });
}
