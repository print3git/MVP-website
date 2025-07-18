const { startDevServer } = require("../scripts/dev-server");
const fs = require("fs");
const path = require("path");

function collectHtmlFiles(
  dir,
  exclude = new Set([
    "backend",
    "tests",
    "node_modules",
    "img",
    "models",
    "uploads",
    "docs",
    "infra",
  ]),
) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectHtmlFiles(full, exclude));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

describe("all frontend routes respond", () => {
  let server;
  let port;

  beforeAll(() => {
    server = startDevServer(0);
    const addr = server.address();
    port = typeof addr === "string" ? 0 : addr.port;
  });

  afterAll((done) => {
    server.close(done);
  });

  const pages = collectHtmlFiles(process.cwd()).map(
    (f) => "/" + path.relative(process.cwd(), f).replace(/\\/g, "/"),
  );

  test.each(pages)("%s returns 200 and HTML", async (page) => {
    const res = await fetch(`http://127.0.0.1:${port}${page}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.trim()).not.toHaveLength(0);
  });
});
