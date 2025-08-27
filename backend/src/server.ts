import { config } from "dotenv";
config();

import { app } from "./app";
import { getEnv } from "./env";
import logger from "./logger.js";

// Validate environment at startup
getEnv();

const port = Number.parseInt(process.env.PORT || "3000", 10);
const PORT = Number.isNaN(port) || port < 1 || port > 65535 ? 3000 : port;

const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

export default server;
