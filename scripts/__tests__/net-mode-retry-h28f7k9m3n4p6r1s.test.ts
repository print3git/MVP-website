jest.mock("child_process", () => ({ execSync: jest.fn() }));
const { execSync } = require("child_process");

test("isOfflineEnv retries ping once before offline mode", async () => {
  execSync
    .mockImplementationOnce(() => {
      throw new Error("fail");
    })
    .mockImplementationOnce(() => "HTTP/1.1 200 OK");
  const { isOfflineEnv } = await import("../net-mode.mjs");
  const result = isOfflineEnv({ retries: 2, timeout: 10 });
  expect(result).toBe(false);
  expect(execSync).toHaveBeenCalledTimes(2);
});
