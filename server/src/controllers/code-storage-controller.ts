import type { Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";
import { codeStorageService } from "../services/code-storage-service.js";

export async function listSavedCode(_req: Request, res: Response): Promise<void> {
  const items = await codeStorageService.listSavedCode();
  res.json({ ok: true, items });
}

export async function getSavedCode(req: Request, res: Response): Promise<void> {
  const titleSlug = req.params.titleSlug?.trim();
  const lang = typeof req.query.lang === "string" ? req.query.lang.trim() : "";

  if (!titleSlug) {
    throw new HttpError(400, "titleSlug is required");
  }

  if (!lang) {
    throw new HttpError(400, "lang query parameter is required");
  }

  const code = await codeStorageService.getCode(titleSlug, lang);
  if (!code) {
    throw new HttpError(404, "Saved code file not found");
  }

  res.json({ ok: true, code });
}

export async function saveCode(req: Request, res: Response): Promise<void> {
  const titleSlug = req.params.titleSlug?.trim();
  if (!titleSlug) {
    throw new HttpError(400, "titleSlug is required");
  }

  const lang = typeof req.body?.lang === "string" ? req.body.lang.trim() : "";
  const code = req.body?.code;

  if (!lang) {
    throw new HttpError(400, "lang is required");
  }

  if (typeof code !== "string") {
    throw new HttpError(400, "code must be a string");
  }

  const saved = await codeStorageService.saveCode(titleSlug, lang, code);

  res.json({ ok: true, saved });
}
