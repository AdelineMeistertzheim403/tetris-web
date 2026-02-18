import { JwtUserPayload } from "../middleware/auth";

// Extension globale Express pour typer `req.user` après `verifyToken`.
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {};
