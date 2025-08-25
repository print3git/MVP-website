import { config } from "dotenv";
config();

import { app } from "./app";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const PORT = Number.isNaN(port) || port < 1 || port > 65535 ? 3000 : port;

export let server: ReturnType<typeof app.listen>;

(async () => {
  if (process.env.RUN_MIGRATIONS_ON_BOOT === "1") {
    const { migrate } = await import("../scripts/migrate");
    await migrate();
  }
  server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
  module.exports = server;
  module.exports.server = server;
})().catch((err) => {
  console.error(err);
});

export default server;
