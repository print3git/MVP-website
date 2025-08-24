"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pg_1 = require("pg");
const validate_js_1 = __importDefault(require("../../middleware/validate.js"));
const logger_js_1 = __importDefault(require("../../../src/logger.js"));
const items_1 = require("../lib/items");
const router = (0, express_1.Router)();
const pool = new pg_1.Pool({
  connectionString: process.env.DB_ENDPOINT,
  user: "postgres",
  password: process.env.DB_PASSWORD,
  database: "postgres",
});
router.post(
  "/api/items",
  (0, validate_js_1.default)(items_1.insertItemSchema),
  async (req, res) => {
    try {
      const { id } = await (0, items_1.insertItem)(pool, req.body);
      res.status(201).json({ id });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "23505"
      ) {
        res.status(409).json({ error: "item name already exists" });
        return;
      }
      logger_js_1.default.error("failed to insert item", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);
exports.default = router;
