import { Pool } from "pg";

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  throw new Error("DB_URL is required");
}

export const pool = new Pool({ connectionString: dbUrl });

export function close(): Promise<void> {
  return pool.end();
}
