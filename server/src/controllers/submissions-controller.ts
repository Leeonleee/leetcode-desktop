import type { Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";
import { leetCodeClient } from "../services/leetcode-client.js";

function readBodyString(req: Request, key: string): string {
  const value = req.body?.[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${key} is required`);
  }

  return value;
}

function toIdString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function extractExecutionId(result: Record<string, unknown>, submit: boolean): string | null {
  if (submit) {
    return (
      toIdString(result.submission_id) ||
      toIdString(result.submissionId) ||
      toIdString(result.submission_id_str)
    );
  }

  return (
    toIdString(result.interpret_id) ||
    toIdString(result.interpretId) ||
    toIdString(result.run_id) ||
    toIdString(result.runId)
  );
}

async function handleRunOrSubmit(req: Request, res: Response, submit: boolean): Promise<void> {
  const session = req.session;
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  const titleSlug = req.params.titleSlug?.trim();
  if (!titleSlug) {
    throw new HttpError(400, "titleSlug is required");
  }

  const lang = readBodyString(req, "lang");
  const questionId = readBodyString(req, "questionId");
  const typedCode = readBodyString(req, "typedCode");
  const dataInput = typeof req.body?.dataInput === "string" ? req.body.dataInput : "";

  const result = await leetCodeClient.runCode(
    session,
    titleSlug,
    { lang, questionId, typedCode, dataInput },
    submit
  );

  const id = extractExecutionId(result, submit);
  if (!id) {
    throw new HttpError(
      502,
      "LeetCode did not return an execution identifier",
      JSON.stringify(result).slice(0, 800)
    );
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(
    submit
      ? { ok: true, submissionId: id, raw: result }
      : { ok: true, runId: id, raw: result }
  );
}

export async function runCode(req: Request, res: Response): Promise<void> {
  await handleRunOrSubmit(req, res, false);
}

export async function submitCode(req: Request, res: Response): Promise<void> {
  await handleRunOrSubmit(req, res, true);
}

export async function checkSubmission(req: Request, res: Response): Promise<void> {
  const session = req.session;
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  const submissionId = req.params.id?.trim();
  if (!submissionId) {
    throw new HttpError(400, "submission id is required");
  }

  const result = await leetCodeClient.checkSubmission(session, submissionId);

  const hasStatusCode = typeof result.status_code === "number";
  const state =
    typeof result.state === "string"
      ? result.state
      : hasStatusCode
        ? "SUCCESS"
        : "PENDING";

  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    state,
    result
  });
}

export async function latestSubmission(req: Request, res: Response): Promise<void> {
  const session = req.session;
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  const questionId = req.params.questionId?.trim();
  const lang = typeof req.query.lang === "string" ? req.query.lang.trim() : "";

  if (!questionId) {
    throw new HttpError(400, "questionId is required");
  }

  if (!lang) {
    throw new HttpError(400, "lang query parameter is required");
  }

  const result = await leetCodeClient.fetchLatestSubmission(session, questionId, lang);

  if (!result || typeof result.code !== "string") {
    throw new HttpError(404, "No latest submission found for this question and language");
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    submission: result
  });
}
