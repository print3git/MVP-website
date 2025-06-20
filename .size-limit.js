const fs = require("fs");
const path = require("path");

const jsDir = path.join(__dirname, "js");

module.exports = fs
  .readdirSync(jsDir)
  .filter((file) => file.endsWith(".js"))
  .map((file) => ({
    path: `js/${file}`,
    limit: "200 KB",
  }));
