const { config } = require("dotenv");
config();

const { app } = require("./app");
const PORT = parseInt(process.env.PORT || "3000", 10);

async function start() {
  if (process.env.RUN_MIGRATIONS_ON_BOOT === "1") {
    await require("../scripts/migrate").migrate();
  }
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
