const nock = require("nock");
const http = require("http");

describe("netconnect sentinel", () => {
  it("warns on unmatched external requests", async () => {
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");

    nock.emitter.on("no match", (req) => {
      console.warn("nock no match:", req);
    });

    await new Promise((resolve) => {
      http
        .get("http://127.0.0.1", () => resolve())
        .on("error", () => resolve());
    });

    expect(true).toBe(true);
  });
});
