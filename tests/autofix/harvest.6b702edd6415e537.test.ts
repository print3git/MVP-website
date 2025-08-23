import fs from "fs";
import path from "path";
import { processLog } from "../../scripts/autofix/harvest.js";

test("processLog writes normalized issue file", () => {
  const tmp = fs.mkdtempSync(path.join(process.cwd(), "harvest-"));
  const orig = process.cwd();
  process.chdir(tmp);
  try {
    const log = "Error: failure at src/file.js:10\nstack";
    const data = processLog({ runId: 1, job: { id: 2, name: "test" } }, log);
    const inbox = path.join("ci", "autofix", "inbox");
    const files = fs.readdirSync(inbox).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe(1);
    const saved = JSON.parse(
      fs.readFileSync(path.join(inbox, files[0]), "utf8"),
    );
    expect(saved.error_hash).toBe(data.error_hash);
    expect(saved.files).toContain("src/file.js");
    expect(saved.snippets[0]).toContain("Error: failure");
  } finally {
    process.chdir(orig);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
