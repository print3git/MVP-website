const { newDb } = require("pg-mem");
const { randomUUID } = require("crypto");

const g = globalThis;
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

const Client = jest.fn(() => new pg.Client());
const Pool = jest.fn(() => new pg.Pool());

module.exports = { Client, Pool };
