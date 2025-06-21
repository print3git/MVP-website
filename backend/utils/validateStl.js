const fs = require("fs");

/**
 * Perform a basic STL file validity check.
 *
 * @param {string} filePath - Path to the STL file to validate.
 * @returns {boolean} True if the file appears to be a valid STL, otherwise false.
 */
function validateStl(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 84) return false;
    const header = buffer.toString("utf8", 0, 80).trim();
    if (header.startsWith("solid")) {
      return buffer.toString("utf8").includes("endsolid");
    }
    const triCount = buffer.readUInt32LE(80);
    return triCount > 0;
  } catch {
    return false;
  }
}

module.exports = validateStl;
