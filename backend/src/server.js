const { config } = require("dotenv");
config();

const app =
  require("./app").app || require("./app").default || require("./app");
const { getEnv } = require("./env");
getEnv();
const port = parseInt(process.env.PORT || "3000", 10);
const PORT = isNaN(port) || port < 1 || port > 65535 ? 3000 : port;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = server;
module.exports.default = server;
module.exports.server = server;
