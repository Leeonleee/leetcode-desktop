import type { Domain } from "./domain.js";

export type UserStatus = {
  userId: number | null;
  userSlug: string | null;
  username: string | null;
  isSignedIn: boolean;
  isPremium: boolean;
  isVerified: boolean;
  activeSessionId: number | null;
};

export type SessionData = {
  token: string;
  cookie: string;
  csrfToken: string;
  domain: Domain;
  user: UserStatus;
  createdAt: number;
  expiresAt: number;
};
