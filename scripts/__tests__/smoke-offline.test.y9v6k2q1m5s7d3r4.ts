import { execSync } from "child_process";

test("smoke script logs offline reason", () => {
  const output = execSync("SKIP_NET_CHECKS=1 node scripts/smoke.mjs", {
    encoding: "utf8",
  });
  expect(output).toMatch(/offline mode: skipping smoke \(SKIP_NET_CHECKS=1\)/);
});
