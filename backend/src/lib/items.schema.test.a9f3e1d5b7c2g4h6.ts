import { insertItemSchema } from "./items";

describe("insertItemSchema", () => {
  test("trims name", () => {
    const parsed = insertItemSchema.parse({
      name: "  spaced  ",
      priceCents: 10,
    });
    expect(parsed.name).toBe("spaced");
  });

  test("rejects huge price", () => {
    expect(() =>
      insertItemSchema.parse({ name: "x", priceCents: 1_000_000_001 }),
    ).toThrow();
  });

  test("defaults currency to USD", () => {
    const parsed = insertItemSchema.parse({ name: "x", priceCents: 10 });
    expect(parsed.currency).toBe("USD");
  });

  test("rejects negative price", () => {
    expect(() =>
      insertItemSchema.parse({ name: "x", priceCents: -1 }),
    ).toThrow();
  });

  test("accepts metadata object", () => {
    const parsed = insertItemSchema.parse({
      name: "x",
      priceCents: 10,
      metadata: { a: 1 },
    });
    expect(parsed.metadata).toEqual({ a: 1 });
  });

  test("requires http or https image URLs", () => {
    expect(() =>
      insertItemSchema.parse({
        name: "x",
        priceCents: 10,
        images: ["ftp://bad"],
      }),
    ).toThrow();
  });
});
