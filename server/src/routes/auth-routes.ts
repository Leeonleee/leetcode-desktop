import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { login, logout, me, authTest } from "../controllers/auth-controller.js";
import { requireSession } from "../middleware/auth.js";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(login));
authRoutes.post("/logout", asyncHandler(logout));
authRoutes.get("/me", requireSession, asyncHandler(me));

// Backward-compatible endpoint from the initial prototype.
authRoutes.post("/test", asyncHandler(authTest));
