import { config } from "dotenv";
config();

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  if (process.env.RUN_MIGRATIONS_ON_BOOT === "1") {
    const { migrate } = await import("../scripts/migrate");
    await migrate();
  }
  const { app } = await import("./app");
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
