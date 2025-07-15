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

test("initEnv ignores malformed lines", () => {
  const lines = [
    "GOOD=value",
    "BADLINE",
    "SPACED = 'a value'",
    "=NOVAR",
    "EMPTY=",
  ].join("\n");
  withTempEnv(lines, () => {
    jest.isolateModules(() => {
      const { env } = require("../scripts/run-smoke.js");
      expect(env.GOOD).toBe("value");
      expect(env.SPACED).toBe("a value");
      expect(env.EMPTY).toBe("");
      expect(env.BADLINE).toBeUndefined();
      expect(env.NOVAR).toBeUndefined();
    });
  });
});
