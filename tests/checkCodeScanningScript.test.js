const http = require("http");
const { execFileSync } = require("child_process");
const path = require("path");

describe("check-code-scanning script", () => {
  test("fails when code scanning disabled", (done) => {
    const server = http.createServer((req, res) => {
      res.end(
        JSON.stringify({
          security_and_analysis: { advanced_security: { status: "disabled" } },
        }),
      );
    });
    server.listen(0, () => {
      server.unref();
      const { port } = server.address();
      try {
        execFileSync("node", [path.join("scripts", "check-code-scanning.js")], {
          env: {
            ...process.env,
            GITHUB_TOKEN: "x",
            CI_REPO_OWNER: "o",
            CI_REPO_NAME: "r",
            GITHUB_API_URL: `http://127.0.0.1:${port}`,
          },
          encoding: "utf8",
          stdio: "pipe",
        });
        throw new Error("script did not exit");
      } catch (err) {
        const output = (err.stdout || "") + (err.stderr || "");
        expect(output).toMatch(/Code scanning is not enabled/);
        server.close(done);
      }
    });
  });

  test("passes when enabled", (done) => {
    const server = http.createServer((req, res) => {
      res.end(
        JSON.stringify({
          security_and_analysis: { advanced_security: { status: "enabled" } },
        }),
      );
    });
    server.listen(0, () => {
      server.unref();
      const { port } = server.address();
      const output = execFileSync(
        "node",
        [path.join("scripts", "check-code-scanning.js")],
        {
          env: {
            ...process.env,
            GITHUB_TOKEN: "x",
            CI_REPO_OWNER: "o",
            CI_REPO_NAME: "r",
            GITHUB_API_URL: `http://127.0.0.1:${port}`,
          },
          encoding: "utf8",
        },
      );
      expect(output).toMatch(/Code scanning enabled/);
      server.close(done);
    });
  });
});
