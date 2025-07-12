const fs = require("fs");
const path = require("path");

test("all specs contain at least one expect", () => {
  const backendRoot = "backend";
  const subdirs = fs
    .readdirSync(backendRoot)
    .filter((d) => fs.statSync(path.join(backendRoot, d)).isDirectory());
  const files = subdirs
    .flatMap((dir) =>
      fs
        .readdirSync(path.join(backendRoot, dir))
        .map((f) => path.join(backendRoot, dir, f)),
    )
    .filter((f) => f.endsWith(".spec.ts"));
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    expect(src).toMatch(/expect\(/, `${file} has no expect()`);
  }
});
