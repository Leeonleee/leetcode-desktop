import type { Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";
import { leetCodeClient } from "../services/leetcode-client.js";
import { sessionStore } from "../services/session-store.js";
import { normalizeDomain } from "../types/domain.js";
import { readSessionToken } from "../middleware/auth.js";

export async function login(req: Request, res: Response): Promise<void> {
  const cookie = typeof req.body?.cookie === "string" ? req.body.cookie.trim() : "";
  const domain = normalizeDomain(req.body?.domain);

  if (!cookie) {
    throw new HttpError(400, "Please provide the full Cookie header value");
  }

  const { user, csrfToken } = await leetCodeClient.login(cookie, domain);
  const session = sessionStore.createSession(cookie, csrfToken, domain, user);

  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    domain,
    sessionToken: session.token,
    user: {
      id: user.userId,
      slug: user.userSlug,
      username: user.username,
      isPremium: user.isPremium,
      isVerified: user.isVerified,
      activeSessionId: user.activeSessionId
    }
  });
}

export async function authTest(req: Request, res: Response): Promise<void> {
  const cookie = typeof req.body?.cookie === "string" ? req.body.cookie.trim() : "";
  const domain = normalizeDomain(req.body?.domain);

  if (!cookie) {
    throw new HttpError(400, "Please provide the full Cookie header value");
  }

  const { user } = await leetCodeClient.login(cookie, domain);

  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    domain,
    user: {
      id: user.userId,
      slug: user.userSlug,
      username: user.username,
      isPremium: user.isPremium,
      isVerified: user.isVerified,
      activeSessionId: user.activeSessionId
    }
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = readSessionToken(req);
  if (token) {
    sessionStore.deleteSession(token);
  }

  res.json({ ok: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  const session = req.session;
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  const user = await leetCodeClient.fetchMe(session);
  session.user = user;

  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    domain: session.domain,
    user: {
      id: user.userId,
      slug: user.userSlug,
      username: user.username,
      isPremium: user.isPremium,
      isVerified: user.isVerified,
      activeSessionId: user.activeSessionId
    }
  });
}
