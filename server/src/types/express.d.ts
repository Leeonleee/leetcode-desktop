import type { SessionData } from "./session.js";

declare global {
  namespace Express {
    interface Request {
      session?: SessionData;
    }
  }
}

export {};
