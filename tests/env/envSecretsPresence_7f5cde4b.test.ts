import fs from "fs";
import path from "path";

describe("required secrets present", () => {
  const required = [
    "DB_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "HF_TOKEN",
  ];

  function loadEnvFile() {
    const envPath = path.resolve(__dirname, "..", "..", ".env");
    const result = {};
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) result[m[1].trim()] = m[2].trim();
      }
    }
    return result;
  }

  test("all secrets defined", () => {
    const fileVars = loadEnvFile();
    const missing = required.filter((name) => {
      return !(process.env[name] || fileVars[name]);
    });
    if (missing.length) {
      throw new Error(`Missing secrets: ${missing.join(", ")}`);
    }
  });
});
