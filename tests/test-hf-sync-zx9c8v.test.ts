import { spawnSync } from "child_process";
import path from "path";
import { setup } from "./sync-atomic/helpers";

test("huggingface space sync completes", () => {
  const { tmp, env, log } = setup();
  const script = path.resolve(__dirname, "../scripts/sync-space.sh");
  const res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  if (res.error) throw res.error;
  console.log(res.stdout, res.stderr);
  expect(res.status).toBe(0);
  const output = require("fs").readFileSync(log, "utf8");
  expect(output).toMatch(/curl/);
  expect(res.stdout).toContain("sync-space completed");
});
