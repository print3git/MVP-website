process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --experimental-vm-modules`;
const { ESLint } = require("eslint");

// Extend Jest's timeout since ESLint may take a while on initial runs
jest.setTimeout(5 * 60 * 1000);

async function lintFiles(files, options = {}) {
  const eslint = new ESLint({ errorOnUnmatchedPattern: false, ...options });
  const results = await eslint.lintFiles(files);
  const warningTotal = results.reduce((sum, r) => sum + r.warningCount, 0);
  if (warningTotal > 0) {
    throw new Error(`ESLint reported ${warningTotal} warnings`);
  }
  return results;
}

async function lintText(code, filePath, options = {}) {
  const eslint = new ESLint({ ...options });
  const results = await eslint.lintText(code, { filePath });
  const warningTotal = results.reduce((sum, r) => sum + r.warningCount, 0);
  if (warningTotal > 0) {
    throw new Error(`ESLint reported ${warningTotal} warnings`);
  }
  return results;
}

module.exports = { lintFiles, lintText };
