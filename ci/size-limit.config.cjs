const { file } = require("@size-limit/file");

module.exports = [
  {
    name: "frontend bundle",
    path: "frontend/dist/assets/*.js",
    limit: "200 KB",
    plugins: [file],
  },
];
