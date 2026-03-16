import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import {
  getSavedCode,
  listSavedCode,
  saveCode
} from "../controllers/code-storage-controller.js";

export const codeStorageRoutes = Router();

codeStorageRoutes.get("/", asyncHandler(listSavedCode));
codeStorageRoutes.get("/:titleSlug", asyncHandler(getSavedCode));
codeStorageRoutes.put("/:titleSlug", asyncHandler(saveCode));
