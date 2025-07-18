import fs from "fs";
import { spawnSync } from "child_process";

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

test("package-lock.json is in sync with package.json", () => {
  const pkg = readJSON("package.json");
  const lock = readJSON("package-lock.json");

  const expected = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const rootLock = lock.packages && lock.packages[""] ? lock.packages[""] : {};
  const actual = {
    ...(rootLock.dependencies || {}),
    ...(rootLock.devDependencies || {}),
  };

  const mismatches = [];
  for (const [name, spec] of Object.entries(expected)) {
    if (!actual[name]) {
      mismatches.push(`missing ${name}`);
    } else if (actual[name] !== spec) {
      mismatches.push(
        `version mismatch for ${name}: expected ${spec} but lock has ${actual[name]}`,
      );
    }
  }
  for (const name of Object.keys(actual)) {
    if (!(name in expected)) {
      mismatches.push(`extra ${name}`);
    }
  }

  if (mismatches.length) {
    console.error("dependency mismatches:\n" + mismatches.join("\n"));
    const ls = spawnSync("npm", ["ls", "--depth=0"], { encoding: "utf8" });
    console.error(ls.stdout);
    const audit = spawnSync("npm", ["audit", "fix", "--dry-run"], {
      encoding: "utf8",
    });
    console.error(audit.stdout);
  }

  expect(mismatches).toEqual([]);
});
