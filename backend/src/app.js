const express = require("express");
const modelsRouter = require("./routes/models");

const app = express();
app.use(express.json());
app.use(modelsRouter);

module.exports = app;
