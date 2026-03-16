import crypto from "node:crypto";
import { config } from "../config.js";
import type { SessionData, UserStatus } from "../types/session.js";
import type { Domain } from "../types/domain.js";

class InMemorySessionStore {
  private sessions = new Map<string, SessionData>();

  createSession(cookie: string, csrfToken: string, domain: Domain, user: UserStatus): SessionData {
    const token = crypto.randomBytes(24).toString("hex");
    const now = Date.now();

    const session: SessionData = {
      token,
      cookie,
      csrfToken,
      domain,
      user,
      createdAt: now,
      expiresAt: now + config.sessionTtlMs
    };

    this.sessions.set(token, session);
    return session;
  }

  getSession(token: string): SessionData | null {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return null;
    }

    session.expiresAt = Date.now() + config.sessionTtlMs;
    return session;
  }

  deleteSession(token: string): void {
    this.sessions.delete(token);
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token);
      }
    }
  }
}

export const sessionStore = new InMemorySessionStore();
