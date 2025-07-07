const { ZodError } = require("zod");

function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const msg = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ error: msg });
      }
      return next(err);
    }
  };
}

module.exports = validate;
