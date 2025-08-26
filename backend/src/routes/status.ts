import { Router } from "express";
import { getStatus } from "../queue/generation";

const router = Router();

router.get("/status/:id", (req, res) => {
  const status = getStatus(req.params.id);
  if (!status) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ id: req.params.id, ...status });
});

export default router;
