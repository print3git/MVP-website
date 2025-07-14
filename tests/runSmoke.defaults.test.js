const fs = require("fs");

function withNoEnvFiles(fn) {
  const files = [".env", ".env.example"];
  const backups = [];
  for (const file of files) {
    if (fs.existsSync(file)) {
      const tmp = `${file}.bak`;
      fs.renameSync(file, tmp);
      backups.push([tmp, file]);
    }
  }
  const saved = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    DB_URL: process.env.DB_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  };
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
  delete process.env.DB_URL;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    fn();
  } finally {
    for (const [tmp, file] of backups) {
      fs.renameSync(tmp, file);
    }
    Object.assign(process.env, saved);
  }
}

test("run-smoke supplies default env vars", () => {
  withNoEnvFiles(() => {
    jest.isolateModules(() => {
      const { env } = require("../scripts/run-smoke.js");
      expect(env.AWS_ACCESS_KEY_ID).toBe("dummy");
      expect(env.AWS_SECRET_ACCESS_KEY).toBe("dummy");
      expect(env.DB_URL).toBe("postgres://user:pass@localhost/db");
      expect(env.STRIPE_SECRET_KEY).toBe("sk_test_dummy");
      expect(env.STRIPE_TEST_KEY).toMatch(/^sk_test_dummy/);
      expect(env.SKIP_DB_CHECK).toBe("1");
    });
  });
});
