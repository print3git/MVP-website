const express = require("express");
const router = express.Router();
const users = require("../users");

router.get("/:id", async (req, res, next) => {
  try {
    const user = await users.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
