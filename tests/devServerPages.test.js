const { startDevServer } = require("../scripts/dev-server");
const fetch = require("node-fetch");

describe("dev server pages", () => {
  let server;
  let port;

  beforeAll(() => {
    server = startDevServer(0);
    port = server.address().port;
  });

  afterAll((done) => {
    server.close(done);
  });

  const pages = ["/index.html", "/login.html", "/signup.html", "/payment.html"];

  test.each(pages)("serves %s", async (page) => {
    const res = await fetch(`http://127.0.0.1:${port}${page}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.trim().toLowerCase().startsWith("<!doctype html")).toBe(true);
  });
});
