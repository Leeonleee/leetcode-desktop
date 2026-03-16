import { useEffect, useMemo, useState } from "react";

import { getErrorMessage, parseJson } from "../lib/app-helpers";
import { DailyApiResponse, DifficultyFilter, Problem, ProblemsApiResponse } from "../types/app";

export const useProblems = (sessionToken: string | null) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("All");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [dailyTitleSlug, setDailyTitleSlug] = useState<string | null>(null);
  const [problemsError, setProblemsError] = useState("");
  const [isProblemsLoading, setIsProblemsLoading] = useState(false);

  useEffect(() => {
    if (!sessionToken) {
      setProblems([]);
      setDailyTitleSlug(null);
      setProblemsError("");
      setSearchQuery("");
      setDifficultyFilter("All");
      return;
    }

    const controller = new AbortController();

    const fetchSidebarData = async () => {
      setIsProblemsLoading(true);
      setProblemsError("");

      try {
        const headers = {
          Authorization: `Bearer ${sessionToken}`
        };

        const [problemsResponse, dailyResponse] = await Promise.all([
          fetch("/api/problems?page=1&pageSize=200", {
            headers,
            signal: controller.signal
          }),
          fetch("/api/problems/daily", {
            headers,
            signal: controller.signal
          })
        ]);

        const problemsPayload = (await parseJson(problemsResponse)) as ProblemsApiResponse | null;
        const dailyPayload = (await parseJson(dailyResponse)) as DailyApiResponse | null;

        if (!problemsResponse.ok) {
          throw new Error(getErrorMessage(problemsPayload, "Failed to load problems."));
        }

        if (!dailyResponse.ok) {
          throw new Error(getErrorMessage(dailyPayload, "Failed to load daily problem."));
        }

        setProblems(Array.isArray(problemsPayload?.items) ? problemsPayload.items : []);
        setDailyTitleSlug(dailyPayload?.daily?.titleSlug || null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setProblemsError(error instanceof Error ? error.message : "Failed to load sidebar.");
      } finally {
        if (!controller.signal.aborted) {
          setIsProblemsLoading(false);
        }
      }
    };

    void fetchSidebarData();

    return () => controller.abort();
  }, [sessionToken]);

  const filteredProblems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return problems.filter((problem) => {
      const matchesDifficulty = difficultyFilter === "All" || problem.difficulty === difficultyFilter;
      const frontendIdText = String(problem.frontendId ?? "").toLowerCase();
      const titleText = String(problem.title ?? "").toLowerCase();
      const titleSlugText = String(problem.titleSlug ?? "").toLowerCase();
      const matchesSearch =
        !normalizedQuery ||
        titleText.includes(normalizedQuery) ||
        titleSlugText.includes(normalizedQuery) ||
        frontendIdText.includes(normalizedQuery);

      return matchesDifficulty && matchesSearch;
    });
  }, [difficultyFilter, problems, searchQuery]);

  const orderedProblems = useMemo(() => {
    const dailyProblem = filteredProblems.find((problem) => problem.titleSlug === dailyTitleSlug);
    const remainingProblems = filteredProblems.filter((problem) => problem.titleSlug !== dailyTitleSlug);

    return dailyProblem ? [dailyProblem, ...remainingProblems] : remainingProblems;
  }, [dailyTitleSlug, filteredProblems]);

  return {
    searchQuery,
    setSearchQuery,
    difficultyFilter,
    setDifficultyFilter,
    problems,
    orderedProblems,
    dailyTitleSlug,
    problemsError,
    isProblemsLoading
  };
};
