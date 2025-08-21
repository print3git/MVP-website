const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(child_process, "execSync").mockImplementation(() => {});
  jest
    .spyOn(child_process, "spawnSync")
    .mockImplementation(() => ({ status: 0, stdout: "", stderr: "" }));
  process.env.SKIP_SETUP = "1";
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.SKIP_SETUP;
});

test("run-smoke executes commands in expected order", () => {
  const { main } = require("../scripts/run-smoke.js");
  main();
  const execs = child_process.execSync.mock.calls.map((c) => c[0]);
  const spawns = child_process.spawnSync.mock.calls.map((c) => c[0]);
  expect(spawns[0]).toBe("npm run validate-env");
  expect([...execs, ...spawns]).not.toContain("npm run setup");
  expect(execs).toContain('pkill -f "node scripts/dev-server.js"');
  expect(execs).toContain("npx -y kill-port 3000");
  const concurrentCmd = spawns.find((c) => c.includes("concurrently"));
  expect(concurrentCmd).toMatch(/wait-on/);
  expect(spawns.indexOf(concurrentCmd)).toBe(spawns.length - 1);
});
