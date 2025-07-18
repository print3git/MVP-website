import fs from "fs";
import path from "path";
import crypto from "crypto";

test("critical config has not regressed", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const baseline = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "fixtures", "knownGoodHash.json"),
      "utf8",
    ),
  );
  const files = Object.keys(baseline);
  for (const file of files) {
    const filePath = path.join(repoRoot, file);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    expect(hash).toBe(baseline[file]);
  }
});
