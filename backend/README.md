# Backend Library

## Database setup

1. Start a Postgres instance locally (e.g. with `docker run --rm -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`) or use an external database.
2. Set `DB_URL` in `.env` to point at your database (e.g., `postgres://postgres:postgres@localhost:5432/test`).
3. Apply migrations:

   ```bash
   npm run db:migrate
   npm run db:check
   ```

## DB tests (pg-mem)

```bash
npm run --prefix backend test:db
```

These tests mock `pg` and register `gen_random_uuid` for UUID generation.

## Sparc3D Client

Example usage:

```ts
import { generateGlb } from "./src/lib/sparc3dClient";

const glb = await generateGlb({ prompt: "a red cube" });
// const glb = await generateGlb({ prompt: 'a red cube', imageURL: 'https://...' });
```
