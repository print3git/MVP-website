const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(child_process, "execSync").mockImplementation(() => {});
  process.env.SKIP_SETUP = "1";
  process.env.SKIP_PW_DEPS = "1";
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.SKIP_SETUP;
  delete process.env.SKIP_PW_DEPS;
});

test("run-smoke executes commands in expected order", () => {
  const { main } = require("../scripts/run-smoke.js");
  main();
  const commands = child_process.execSync.mock.calls.map((c) => c[0]);
  expect(commands[0]).toBe("npm run validate-env");
  expect(commands).not.toContain("npm run setup");
  expect(commands).toContain('pkill -f "node scripts/dev-server.js"');
  const killPortIdx = commands.indexOf("npx -y kill-port 3000");
  expect(killPortIdx).toBeGreaterThan(-1);
  const concurrentCmd = commands.find((c) => c.includes("concurrently"));
  expect(concurrentCmd).toMatch(/wait-on/);
  expect(commands.indexOf(concurrentCmd)).toBe(commands.length - 1);
});
