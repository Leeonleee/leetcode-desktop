import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";
import { sessionStore } from "../services/session-store.js";

function readToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const tokenHeader = req.header("x-session-token");
  return tokenHeader?.trim() || null;
}

export function requireSession(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);

  if (!token) {
    next(new HttpError(401, "Missing session token"));
    return;
  }

  const session = sessionStore.getSession(token);
  if (!session) {
    next(new HttpError(401, "Invalid or expired session token"));
    return;
  }

  req.session = session;
  next();
}

export function readSessionToken(req: Request): string | null {
  return readToken(req);
}
