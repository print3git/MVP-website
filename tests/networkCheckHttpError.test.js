const { execFileSync } = require("child_process");
const http = require("http");
const path = require("path");

describe("network-check HTTP errors", () => {
  test("fails on non-2xx status", (done) => {
    const server = http.createServer((req, res) => {
      res.statusCode = 404;
      res.end();
    });
    server.listen(0, () => {
      const { port } = server.address();
      expect(() => {
        execFileSync("node", [path.join("scripts", "network-check.js")], {
          env: {
            ...process.env,
            NETWORK_CHECK_URL: `http://127.0.0.1:${port}`,
          },
          encoding: "utf8",
        });
      }).toThrow(/Unable to reach/);
      server.close(done);
    });
  });
});
