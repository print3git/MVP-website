const { execSync } = require("child_process");
const nock = require("nock");

describe("npm registry connectivity", () => {
  test("npm ping succeeds", () => {
    nock.enableNetConnect();
    expect(() => execSync("npm ping", { stdio: "pipe" })).not.toThrow();
  });
});
