import express from "express";
import checkout from "./routes/stripe/create-checkout-session";

const app = express();
app.use(express.json());
app.use(checkout);

export default app;

