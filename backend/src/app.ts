import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import healthRouter from "./routes/health";
import itemsRouter from "./routes/items";
import checkoutRouter from "./routes/checkout";
import stripeWebhookRouter from "./routes/stripeWebhook";
import stripeCheckoutRouter from "./routes/stripe/create-checkout-session";
import modelsRouter from "./routes/models";
import { capture } from "./lib/logger";
import logger from "../../src/logger.js";
import { removedEndpoints } from "./middleware/removedEndpoints";

export const app = express();

app.use(stripeWebhookRouter);
app.use(express.json());
app.use(removedEndpoints);
app.use(healthRouter);
app.use(itemsRouter);
app.use(checkoutRouter);
app.use(stripeCheckoutRouter);
app.use("/api/models", modelsRouter);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const context = { method: req.method, url: req.originalUrl, body: req.body };
  try {
    logger.error("Error handling request", context, err);
  } catch (_logErr) {
    // ignore logging failures
  }
  capture(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
module.exports = app;
module.exports.app = app;
