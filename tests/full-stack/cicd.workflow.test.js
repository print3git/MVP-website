const { spawn } = require("child_process");

jest.setTimeout(1000 * 60 * 10);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
    });
  });
}

describe("ci workflow", () => {
  test("lint, typecheck, build pass", async () => {
    await run("npx", ["eslint", "tests/full-stack"]);
    await run("npx", [
      "tsc",
      "--noEmit",
      "tests/full-stack/e2e-signup.spec.ts",
    ]);
    await run("npm", ["run", "build:frontend"]);
  });
});
