const fetch = require("node-fetch");

describe("dev server pages", () => {
  const pages = ["/index.html", "/login.html", "/signup.html", "/payment.html"];

  test.each(pages)("serves %s", async (page) => {
    const base = globalThis.__TEST_BASE_URL__;
    const res = await fetch(`${base}${page}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.trim().toLowerCase().startsWith("<!doctype html")).toBe(true);
  });
});
