const { execFileSync } = require("child_process");
const path = require("path");

describe("network-check script failure", () => {
  test("exits when target unreachable", () => {
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        env: {
          ...process.env,
          NET_CHECK_URLS: "http://127.0.0.1:9",
          http_proxy: "",
          https_proxy: "",
          HTTP_PROXY: "",
          HTTPS_PROXY: "",
          npm_config_http_proxy: "",
          npm_config_https_proxy: "",
        },
        encoding: "utf8",
        stdio: "pipe",
      });
    }).toThrow(/Unable to reach/);
  });
});
