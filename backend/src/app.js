const express = require("express");
const modelsRouter = require("./routes/models");
const checkoutRouter = require("./routes/checkout").default;

const app = express();
app.use(express.json());
app.use(modelsRouter);
app.use(checkoutRouter);

module.exports = app;
