const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, "..", ".env");

function withTempEnv(content, fn) {
  const exists = fs.existsSync(envFile);
  const backup = exists ? fs.readFileSync(envFile, "utf8") : null;
  fs.writeFileSync(envFile, content);
  try {
    fn();
  } finally {
    if (exists) {
      fs.writeFileSync(envFile, backup);
    } else {
      fs.unlinkSync(envFile);
    }
  }
}

test("run-smoke loads variables from .env", () => {
  withTempEnv("CUSTOM_SMOKE_VAR=hello", () => {
    jest.isolateModules(() => {
      const { env } = require("../scripts/run-smoke.js");
      expect(env.CUSTOM_SMOKE_VAR).toBe("hello");
    });
  });
});
