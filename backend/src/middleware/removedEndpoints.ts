import { Request, Response, NextFunction } from 'express';
const removed = new Set<string>(['/api/generate-model']);
export function removedEndpoints(req: Request, res: Response, next: NextFunction) {
  if (removed.has(req.path)) {
    return res.status(410).json({ error: 'removed' });
  }
  return next();
}
