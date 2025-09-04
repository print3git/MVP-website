const { file } = require("@size-limit/file");

module.exports = [
  {
    name: "js bundle",
    path: "js/*.js",
    limit: "200 KB",
    plugins: [file],
  },
];
