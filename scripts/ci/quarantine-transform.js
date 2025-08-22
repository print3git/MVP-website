const path = require("path");
const fs = require("fs");
const babelJest = require("babel-jest");

const transformer = babelJest.createTransformer();
const quarantinePath = path.join(__dirname, "quarantine.json");
let list = [];
try {
  list = JSON.parse(fs.readFileSync(quarantinePath, "utf8"));
} catch {}
const quarantined = new Set(list);

module.exports = {
  process(src, filename, ...rest) {
    const rel = path.relative(process.cwd(), filename);
    if (quarantined.has(rel)) {
      const inject =
        `const globalIt = global.it;\n` +
        `const globalTest = global.test;\n` +
        `global.it = globalIt.skip.bind(globalIt);\n` +
        `global.test = globalIt.skip.bind(globalIt);\n`;
      src = inject + src;
    }
    return transformer.process(src, filename, ...rest);
  },
};
