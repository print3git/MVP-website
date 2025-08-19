const path = require("path");
const { spawnSync } = require("child_process");

const mockFs = {
  readFileSync: jest.fn(() => "{}"),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => false),
};
jest.mock("fs", () => mockFs);

process.argv = ["node", "test", "cfg.json"];
const {
  updateDnsRecord,
  validateEnv,
} = require("../scripts/auto-cloudflare-config.ts");

describe("cloudflare configuration diagnostics", () => {
  describe("environment variables", () => {
    test("throws when required variables are missing", () => {
      delete process.env.CLOUDFLARE_API_TOKEN;
      delete process.env.CLOUDFLARE_ZONE_ID;
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      expect(() => validateEnv()).toThrow(
        "Missing CLOUDFLARE_API_TOKEN – did you forget to set it?",
      );
    });

    test("throws on placeholder values", () => {
      process.env.CLOUDFLARE_API_TOKEN = "<token>";
      process.env.CLOUDFLARE_ZONE_ID = "your_zone";
      process.env.CLOUDFLARE_ACCOUNT_ID = "example";
      expect(() => validateEnv()).toThrow(
        "Missing CLOUDFLARE_API_TOKEN – did you forget to set it?",
      );
    });

    test("passes when variables are set", () => {
      process.env.CLOUDFLARE_API_TOKEN = "token";
      process.env.CLOUDFLARE_ZONE_ID = "zone";
      process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
      expect(() => validateEnv()).not.toThrow();
    });
  });

  test("dry-run DNS update uses no network", async () => {
    process.env.CLOUDFLARE_API_TOKEN = "token";
    process.env.CLOUDFLARE_ZONE_ID = "zone";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    const originalFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await updateDnsRecord(
      { type: "A", name: "example.com", content: "1.2.3.4" },
      { dryRun: true },
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.some((c) => c[0].includes("[dry-run]"))).toBe(
      true,
    );
    logSpy.mockRestore();
    global.fetch = originalFetch;
  });

  describe("error handling", () => {
    async function expectError(status, message) {
      process.env.CLOUDFLARE_API_TOKEN = "token";
      process.env.CLOUDFLARE_ZONE_ID = "zone";
      process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
      global.fetch = jest
        .fn()
        .mockResolvedValue({
          ok: false,
          status,
          json: async () => ({ errors: [{ message }] }),
        });
      await expect(
        updateDnsRecord({ type: "A", name: "foo", content: "1.1.1.1" }),
      ).rejects.toThrow(message);
    }

    test("invalid API token", async () => {
      await expectError(401, "invalid api token");
    });

    test("zone not found", async () => {
      await expectError(404, "zone not found");
    });

    test("permission denied", async () => {
      await expectError(403, "permission denied");
    });
  });

  test("ESLint passes with no warnings", () => {
    const repoRoot = path.join(__dirname, "..");
    const child = `
      const { ESLint } = require('eslint');
      (async () => {
        const eslint = new ESLint({ cwd: ${JSON.stringify(repoRoot)} });
        const results = await eslint.lintFiles(['scripts/auto-cloudflare-config.ts']);
        process.stdout.write(JSON.stringify(results));
      })().catch(err => { console.error(err); process.exit(1); });
    `;
    const proc = spawnSync(
      process.execPath,
      ["--experimental-vm-modules", "--eval", child],
      { cwd: repoRoot, encoding: "utf8" },
    );
    if (proc.status !== 0) {
      console.error(proc.stderr);
    }
    expect(proc.status).toBe(0);
    const results = JSON.parse(proc.stdout || "[]");
    const problems = results.reduce(
      (sum, r) => sum + r.errorCount + r.warningCount,
      0,
    );
    if (problems !== 0) {
      const messages = results
        .flatMap((r) => r.messages.map((m) => m.message))
        .join("\n");
      throw new Error(`ESLint reported problems:\n${messages}`);
    }
  });
});
