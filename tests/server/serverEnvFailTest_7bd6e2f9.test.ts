// critical
import { execFileSync } from "child_process";
import path from "path";

describe("server env validation", () => {
  test("fails to start without CLOUDFRONT_MODEL_DOMAIN", () => {
    const server = path.join(__dirname, "..", "..", "backend", "server.js");
    expect(() => {
      execFileSync("node", [server], {
        env: {
          ...process.env,
          NODE_ENV: "production",
          CLOUDFRONT_MODEL_DOMAIN: "",
        },
        encoding: "utf8",
        timeout: 5000,
      });
    }).toThrow(/CLOUDFRONT_MODEL_DOMAIN/);
  });
});
