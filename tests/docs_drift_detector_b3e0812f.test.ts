import fs from "fs";
import path from "path";

describe("documentation service coverage", () => {
  const services = ["Sparc3D", "Hugging Face", "S3", "Stripe", "SendGrid"];

  function read(file) {
    try {
      return fs.readFileSync(file, "utf8");
    } catch {
      return "";
    }
  }

  test("README and setup docs mention all services", () => {
    const repoRoot = path.join(__dirname, "..");
    const content =
      read(path.join(repoRoot, "README.md")) +
      read(path.join(repoRoot, "docs", "setup.md")) +
      read(path.join(repoRoot, "docs", "env.md"));
    for (const svc of services) {
      expect(content).toContain(svc);
    }
  });
});
