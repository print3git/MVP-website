const express = require("express");
const modelsRouter = require("./routes/models");
const correlationId = require("../middleware/correlationId");

const app = express();
app.use(correlationId);
app.use(express.json());
app.use(modelsRouter);

module.exports = app;
