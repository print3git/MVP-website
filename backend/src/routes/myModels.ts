import { Router, type Request, type Response } from "express";
import { authRequired, userIdFromAuth } from "../lib/auth";
import logger from "../logger";

interface UserCreationRowRaw {
  id: string;
  title?: string | null;
  category?: string | null;
  job_id: string;
  model_url: string;
  snapshot?: string | null;
  prompt?: string | null;
}

interface UserCreationResponse {
  id: string;
  title: string | null;
  category: string | null;
  job_id: string;
  model_url: string;
  snapshot: string | null;
  prompt: string | null;
}

function parseNumericQuery(value: unknown, defaultValue: number): number {
  if (Array.isArray(value)) {
    return parseNumericQuery(value[0], defaultValue);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return defaultValue;
}

const router = Router();

const {
  getUserCreations,
}: {
  getUserCreations: (
    userId: string,
    limit?: number,
    offset?: number,
  ) => Promise<UserCreationRowRaw[]>;
} = require("../../db");

router.get("/", authRequired, async (req: Request, res: Response) => {
  const userId = userIdFromAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const query = req.query as { limit?: unknown; offset?: unknown };
  const limit = parseNumericQuery(query.limit, 10);
  const offset = parseNumericQuery(query.offset, 0);

  try {
    const rows = await getUserCreations(userId, limit, offset);
    const models: UserCreationResponse[] = rows.map((row) => ({
      id: row.id,
      title: row.title ?? null,
      category: row.category ?? null,
      job_id: row.job_id,
      model_url: row.model_url,
      snapshot: row.snapshot ?? null,
      prompt: row.prompt ?? row.title ?? null,
    }));

    res.json(models);
  } catch (err) {
    logger.error("my_models_fetch_failed", err as Error);
    res.status(500).json({ error: "unexpected_error" });
  }
});

export default router;
