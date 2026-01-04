import { JwtUserPayload } from "../middleware/auth";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {};
