const fs = require("fs");

const jestPath = "node_modules/.bin/jest";

if (!fs.existsSync(jestPath)) {
  console.error(
    "Jest not found in backend. Run 'npm run setup' from the repository root to install dependencies.",
  );
  process.exit(1);
}
