import { newDb } from "pg-mem";
import { randomUUID } from "crypto";

type GlobalWithDb = typeof globalThis & {
  __PGMEM_DB__?: ReturnType<typeof newDb>;
};
const g = globalThis as GlobalWithDb;

if (!g.__PGMEM_DB__) {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: "gen_random_uuid",
    returns: "uuid",
    implementation: randomUUID,
    impure: true,
  });
  g.__PGMEM_DB__ = db;
}

const pg = g.__PGMEM_DB__.adapters.createPg();

export const Client = jest.fn(() => new pg.Client());
export const Pool = jest.fn(() => new pg.Pool());
