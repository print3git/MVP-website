import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

function fetch(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith("https://") ? https : http;
    mod.get(url, () => resolve()).on("error", () => resolve());
  });
}

describe("download url security", () => {
  test("all download urls use https", async () => {
    const file = path.join(__dirname, "..", "scripts", "network-check.js");
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(/https?:\/\/[^'"\s,]+/g) || [];
    const urls = Array.from(
      new Set(matches.filter((u) => !u.includes("localhost"))),
    );
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.startsWith("https://")).toBe(true);
      await fetch(url);
    }
  });
});
