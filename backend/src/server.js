const { config } = require("dotenv");
config();

const { app } = require("./app");
const port = parseInt(process.env.PORT || "3000", 10);
const PORT = isNaN(port) || port < 1 || port > 65535 ? 3000 : port;

let server;

(async () => {
  if (process.env.RUN_MIGRATIONS_ON_BOOT === "1") {
    await require("../scripts/migrate").migrate();
  }
  server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
  module.exports = server;
  module.exports.server = server;
})().catch((err) => {
  console.error(err);
});
