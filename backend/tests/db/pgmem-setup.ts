import { newDb } from "pg-mem";
import { randomUUID } from "crypto";

export const db = newDb({ autoCreateForeignKeyIndices: true });

db.public.registerFunction({
  name: "gen_random_uuid",
  returns: "uuid",
  implementation: randomUUID,
  impure: true,
});

export async function makeClient() {
  const pg = db.adapters.createPg();
  const client = new pg.Client();
  await client.connect();
  return client;
}

export async function runSql(sql: string) {
  const client = await makeClient();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}
