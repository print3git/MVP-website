const fs = require("fs");
const path = require("path");

test("test-backend script exists and runs backend tests", () => {
  const script = path.join(__dirname, "..", "scripts", "test-backend.sh");
  const content = fs.readFileSync(script, "utf8");
  expect(content).toMatch(/npm test --prefix backend/);
});
