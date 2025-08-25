import type { Pool } from "pg";
import { z } from "zod";

export const insertItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(1).max(1_000_000_000),
  currency: z.string().default("USD"),
  images: z
    .array(
      z
        .string()
        .url()
        .refine(
          (u) => u.startsWith("http://") || u.startsWith("https://"),
          "invalid url",
        ),
    )
    .default([]),
  metadata: z.record(z.any()).default({}),
});

export type InsertItemInput = z.infer<typeof insertItemSchema>;

export async function insertItem(
  db: Pool,
  payload: InsertItemInput,
): Promise<{ id: string }> {
  const data = insertItemSchema.parse(payload);
  const res = await db.query(
    `INSERT INTO items (name, description, price_cents, currency, images, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      data.name,
      data.description ?? null,
      data.priceCents,
      data.currency,
      JSON.stringify(data.images),
      data.metadata,
    ],
  );
  return { id: res.rows[0].id as string };
}
