import { config } from "dotenv";
import { pool, close } from "../src/db";

config();

export async function check(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("✅ database OK");
  } finally {
    client.release();
  }
}

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
