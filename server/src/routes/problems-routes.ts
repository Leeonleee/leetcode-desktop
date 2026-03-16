import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { requireSession } from "../middleware/auth.js";
import { getDaily, getProblem, listProblems } from "../controllers/problems-controller.js";
import { latestSubmission, runCode, submitCode } from "../controllers/submissions-controller.js";

export const problemsRoutes = Router();

problemsRoutes.use(requireSession);

problemsRoutes.get("/", asyncHandler(listProblems));
problemsRoutes.get("/daily", asyncHandler(getDaily));
problemsRoutes.get("/:questionId/submissions/latest", asyncHandler(latestSubmission));
problemsRoutes.post("/:titleSlug/run", asyncHandler(runCode));
problemsRoutes.post("/:titleSlug/submit", asyncHandler(submitCode));
problemsRoutes.get("/:titleSlug", asyncHandler(getProblem));
