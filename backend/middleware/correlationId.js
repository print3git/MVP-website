const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

module.exports = function correlationId(req, res, next) {
  const id = uuidv4();
  req.correlationId = id;
  req.logger = logger.child({ correlationId: id });
  res.setHeader("X-Correlation-ID", id);
  next();
};
