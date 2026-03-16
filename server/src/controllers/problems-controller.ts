import type { Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";
import { leetCodeClient } from "../services/leetcode-client.js";

function normalizeStatus(status: unknown): "ac" | "notac" | "todo" | null {
  if (status === "ac" || status === "notac" || status === "todo") {
    return status;
  }
  return null;
}

function normalizeDifficulty(value: unknown): "Easy" | "Medium" | "Hard" | null {
  if (value === "Easy" || value === "Medium" || value === "Hard") {
    return value;
  }

  return null;
}

export async function listProblems(req: Request, res: Response): Promise<void> {
  const session = req.session;
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  const allProblems = await leetCodeClient.fetchProblems(session);

  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  const status = normalizeStatus(req.query.status);
  const difficulty = normalizeDifficulty(req.query.difficulty);
  const paidOnly =
    req.query.paidOnly === "true" ? true : req.query.paidOnly === "false" ? false : null;

  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 50)));

  let filtered = allProblems;

  if (search) {
    filtered = filtered.filter((problem) => {
      return (
        problem.title.toLowerCase().includes(search) ||
        problem.titleSlug.toLowerCase().includes(search) ||
        problem.frontendId.toLowerCase().includes(search)
      );
    });
  }

  if (status) {
    filtered = filtered.filter((problem) => problem.status === status);
  }

  if (difficulty) {
    filtered = filtered.filter((problem) => problem.difficulty === difficulty);
  }

  if (paidOnly !== null) {
    filtered = filtered.filter((problem) => problem.paidOnly === paidOnly);
  }

  const total = filtered.length;
  const pageStart = (page - 1) * pageSize;
  const items = filtered.slice(pageStart, pageStart + pageSize);

  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    page,
    pageSize,
    total,
    items
  });
}

export async function getProblem(req: Request, res: Response): Promise<void> {
  const session = req.session;
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  const titleSlug = req.params.titleSlug?.trim();
  if (!titleSlug) {
    throw new HttpError(400, "titleSlug is required");
  }

  const question = await leetCodeClient.fetchQuestionDetail(session, titleSlug);

  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, question });
}

export async function getDaily(req: Request, res: Response): Promise<void> {
  const session = req.session;
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  const daily = await leetCodeClient.fetchDaily(session);

  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, daily });
}
