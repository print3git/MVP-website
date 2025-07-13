describe("ensure-root-deps", () => {
  test("checks network then installs", () => {
    jest.isolateModules(() => {
      jest.doMock("fs", () => ({ existsSync: () => false }));
      const execSync = jest.fn();
      jest.doMock("child_process", () => ({ execSync }));
      require("../scripts/ensure-root-deps.js");
      expect(execSync.mock.calls.map((c) => c[0])).toContain("npm ci");
    });
  });

  test("retries on network failure", () => {
    jest.isolateModules(() => {
      jest.doMock("fs", () => ({ existsSync: () => false }));
      const execSync = jest.fn((cmd) => {
        if (cmd.startsWith("npm ci") && !execSync.failed) {
          execSync.failed = true;
          throw new Error("ECONNRESET");
        }
      });
      jest.doMock("child_process", () => ({ execSync }));
      require("../scripts/ensure-root-deps.js");
      expect(execSync.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
  });
});
