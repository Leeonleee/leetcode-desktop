import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { requireSession } from "../middleware/auth.js";
import { checkSubmission } from "../controllers/submissions-controller.js";

export const submissionsRoutes = Router();

submissionsRoutes.use(requireSession);
submissionsRoutes.get("/:id/check", asyncHandler(checkSubmission));
