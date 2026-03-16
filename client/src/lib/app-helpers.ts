import { Problem } from "../types/app";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const getErrorMessage = (payload: unknown, fallback: string): string => {
  if (isRecord(payload) && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
};

export const getDifficultyClasses = (difficulty: Problem["difficulty"]) => {
  if (difficulty === "Easy") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (difficulty === "Medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
};
