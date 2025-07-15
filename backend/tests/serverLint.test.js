const { spawnSync } = require("child_process");
const path = require("path");

test("backend/server.js passes eslint", () => {
  const { status } = spawnSync(
    "npx",
    ["eslint", "--no-warn-ignored", "backend/server.js"],
    {
      encoding: "utf8",
      cwd: path.join(__dirname, "..", ".."),
    },
  );
  expect(status).toBe(0);
});
