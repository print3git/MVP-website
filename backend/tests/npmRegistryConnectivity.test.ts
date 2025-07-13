const { execSync } = require("child_process");
const nock = require("nock");

describe("npm registry connectivity", () => {
  test("npm ping succeeds", () => {
    if (process.env.SKIP_NET_CHECKS) {
      console.warn("Skipping npm ping due to SKIP_NET_CHECKS");
      return;
    }
    nock.enableNetConnect();
    expect(() => execSync("npm ping", { stdio: "pipe" })).not.toThrow();
  });
});
