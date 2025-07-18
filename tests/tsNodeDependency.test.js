const fs = require("fs");

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

test("ts-node is listed as a dev dependency", () => {
  const pkg = readJSON("package.json");
  expect(pkg.devDependencies && pkg.devDependencies["ts-node"]).toBeDefined();
});

test("ts-node version matches lockfile", () => {
  const pkg = readJSON("package.json");
  const lock = readJSON("package-lock.json");
  const root = lock.packages && lock.packages[""] ? lock.packages[""] : {};
  expect(root.devDependencies && root.devDependencies["ts-node"]).toBe(
    pkg.devDependencies["ts-node"],
  );
});
