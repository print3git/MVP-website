const fs = require("fs");
const path = require("path");
const nock = require("nock");

describe("nock external call reporter", () => {
  const offenders = [];

  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect(/^(127\.0\.0\.1|localhost)$/);

    nock.emitter.on("no match", (req) => {
      offenders.push({
        method: req.method,
        host: req.hostname || req.host,
        path: req.path,
      });
    });
  });

  afterAll(() => {
    const artifactPath = path.resolve(
      __dirname,
      "../../.artifacts/netconnect.json",
    );
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, JSON.stringify(offenders, null, 2));
  });

  it("reports unexpected network connections", () => {
    expect(true).toBe(true);
  });
});
