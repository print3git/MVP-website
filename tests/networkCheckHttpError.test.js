const { execFileSync } = require("child_process");
const http = require("http");
const path = require("path");

describe("network-check HTTP errors", () => {
  test("ignores 4xx responses", (done) => {
    const server = http.createServer((req, res) => {
      res.statusCode = 404;
      res.end();
    });
    server.listen(0, () => {
      const { port } = server.address();
      const out = execFileSync(
        "node",
        [path.join("scripts", "network-check.js")],
        {
          env: {
            ...process.env,
            NETWORK_CHECK_URL: `http://127.0.0.1:${port}`,
          },
          encoding: "utf8",
        },
      );
      expect(out).toContain("✅ network OK");
      server.close(done);
    });
  });
});
