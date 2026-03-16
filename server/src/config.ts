import path from "node:path";

const minute = 60_000;
const hour = 60 * minute;

export const config = {
  port: Number(process.env.PORT || 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 24 * hour),
  upstreamTimeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS || 12_000),
  solutionsDir:
    process.env.SOLUTIONS_DIR || path.resolve(process.cwd(), "local-solutions")
} as const;
