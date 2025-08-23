import fs from "fs";
import path from "path";
import { runCi } from "../autofix/codex-driver.js";

const fixtureDir = path.join(__dirname, "fixtures", "logs");

test("ci mode generates suggestion", async () => {
  const input = path.join(fixtureDir, "failures.json");
  const summary = path.join(fixtureDir, "summary.md");
  const out = path.join(__dirname, "tmp-out");
  await runCi({ input, summary, out });
  const result = fs.readFileSync(path.join(out, "suggestion.md"), "utf8");
  expect(result.trim().length).toBeGreaterThan(0);
});
