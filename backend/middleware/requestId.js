const httpContext = require("express-http-context");
const { v4: uuidv4 } = require("uuid");

module.exports = function requestId(req, res, next) {
  const id = req.headers["x-request-id"] || uuidv4();
  res.locals.requestId = id;
  httpContext.set("requestId", id);
  res.setHeader("X-Request-Id", id);
  next();
};
