"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertItem = exports.insertItemSchema = void 0;
const zod_1 = require("zod");
exports.insertItemSchema = zod_1.z.object({
  name: zod_1.z.string().trim().min(1).max(120),
  description: zod_1.z.string().max(2000).optional(),
  priceCents: zod_1.z.number().int().min(1).max(1_000_000_000),
  currency: zod_1.z.string().default("USD"),
  images: zod_1.z
    .array(
      zod_1.z
        .string()
        .url()
        .refine(
          (u) => u.startsWith("http://") || u.startsWith("https://"),
          "invalid url",
        ),
    )
    .default([]),
  metadata: zod_1.z.record(zod_1.z.any()).default({}),
});
async function insertItem(db, payload) {
  const data = exports.insertItemSchema.parse(payload);
  const res = await db.query(
    `INSERT INTO items (name, description, price_cents, currency, images, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      data.name,
      data.description ?? null,
      data.priceCents,
      data.currency,
      JSON.stringify(data.images),
      data.metadata,
    ],
  );
  return { id: res.rows[0].id };
}
exports.insertItem = insertItem;
