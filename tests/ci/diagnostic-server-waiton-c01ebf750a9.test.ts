/* eslint-disable jsdoc/check-tag-names */
/**
 * @ciOnly
 */
import { spawn } from "child_process";
import path from "path";

jest.setTimeout(15000);

describe("server start diagnostics", () => {
  let proc;
  let logs = "";

  afterEach(() => {
    if (proc) proc.kill();
  });

  test("responds on / within 10s", async () => {
    const serverPath = path.join(__dirname, "..", "..", "backend", "server.js");
    proc = spawn(process.execPath, [serverPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    proc.stdout?.on("data", (d) => {
      logs += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      logs += d.toString();
    });

    const deadline = Date.now() + 10000;
    let lastError = new Error("timeout");

    while (Date.now() < deadline) {
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 1000);
        const res = await fetch("http://localhost:3000", { signal: ac.signal });
        clearTimeout(timer);
        if (res.status === 200) {
          const text = await res.text();
          expect(text.trim().toLowerCase().startsWith("<!doctype html")).toBe(
            true,
          );
          return;
        }
        lastError = new Error(`status ${res.status}`);
      } catch (err) {
        lastError = err;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    throw new Error(
      `Server failed to respond within 10s: ${lastError?.stack || lastError}\n${logs}`,
    );
  });
});
