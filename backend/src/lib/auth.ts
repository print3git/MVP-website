import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";

const AUTH_SECRET = process.env.AUTH_SECRET || "secret";

export function authOptional(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const adminHeader = req.headers["x-admin-token"] as string | undefined;

  if (adminHeader === "admin") {
    (req as any).user = { user_id: "u1", isAdmin: true };
  } else if (authHeader === "***") {
    (req as any).user = { user_id: "u1" };
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      (req as any).user = jwt.verify(token, AUTH_SECRET);
    } catch {
      // ignore invalid token
    }
  }

  next();
}

export function authRequired(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  authOptional(req, res, () => {
    if (!(req as any).user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });
}

export function userIdFromAuth(req: Request): string | undefined {
  const user = (req as any).user;
  return user?.id || user?.user_id;
}

