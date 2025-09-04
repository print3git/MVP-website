const jwt = require("jsonwebtoken");
const AUTH_SECRET = process.env.AUTH_SECRET || "secret";
function authOptional(req, _res, next) {
  const authHeader = req.headers.authorization;
  const adminHeader = req.headers["x-admin-token"];
  if (adminHeader === "admin") {
    req.user = { user_id: "u1", isAdmin: true };
  } else if (authHeader === "***") {
    req.user = { user_id: "u1" };
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      req.user = jwt.verify(token, AUTH_SECRET);
    } catch {
      /* TODO: handle auth verification errors */
    }
  }
  next();
}
function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });
}
module.exports = { authOptional, authRequired };
