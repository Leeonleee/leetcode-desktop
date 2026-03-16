import type { NextFunction, Request, Response } from "express";
import { isHttpError } from "../lib/http-error.js";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    status: 404,
    message: "Endpoint not found"
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isHttpError(error)) {
    res.status(error.status).json({
      ok: false,
      status: error.status,
      message: error.message,
      details: error.details
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown error";

  res.status(500).json({
    ok: false,
    status: 500,
    message: "Internal server error",
    details: message
  });
}
