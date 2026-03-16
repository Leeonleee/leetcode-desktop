import { useEffect, useMemo, useState } from "react";

import { getErrorMessage, parseJson } from "../lib/app-helpers";
import { DailyApiResponse, DifficultyFilter, Problem, ProblemsApiResponse } from "../types/app";

export const useProblems = (sessionToken: string | null) => {
  const apiPageSize = 200;
  const displayPageSize = 100;
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("All");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [dailyTitleSlug, setDailyTitleSlug] = useState<string | null>(null);
  const [problemsError, setProblemsError] = useState("");
  const [isProblemsLoading, setIsProblemsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!sessionToken) {
      setProblems([]);
      setDailyTitleSlug(null);
      setProblemsError("");
      setSearchQuery("");
      setDifficultyFilter("All");
      setCurrentPage(1);
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

        const dailyRequest = fetch("/api/problems/daily", {
          headers,
          signal: controller.signal
        });

        const firstProblemsResponse = await fetch(`/api/problems?page=1&pageSize=${apiPageSize}`, {
          headers,
          signal: controller.signal
        });
        const firstProblemsPayload = (await parseJson(firstProblemsResponse)) as ProblemsApiResponse | null;

        if (!firstProblemsResponse.ok) {
          throw new Error(getErrorMessage(firstProblemsPayload, "Failed to load problems."));
        }

        const firstItems = Array.isArray(firstProblemsPayload?.items) ? firstProblemsPayload.items : [];
        const totalProblems =
          typeof firstProblemsPayload?.total === "number" ? firstProblemsPayload.total : firstItems.length;
        const totalPages = Math.max(1, Math.ceil(totalProblems / apiPageSize));

        const remainingPageRequests =
          totalPages > 1
            ? await Promise.all(
                Array.from({ length: totalPages - 1 }, (_, index) =>
                  fetch(`/api/problems?page=${index + 2}&pageSize=${apiPageSize}`, {
                    headers,
                    signal: controller.signal
                  })
                )
              )
            : [];

        const remainingPayloads =
          remainingPageRequests.length > 0
            ? await Promise.all(remainingPageRequests.map((response) => parseJson(response)))
            : [];

        const allItems = [...firstItems];

        remainingPageRequests.forEach((response, index) => {
          const payload = remainingPayloads[index] as ProblemsApiResponse | null;
          if (!response.ok) {
            throw new Error(getErrorMessage(payload, "Failed to load problems."));
          }
          const items = Array.isArray(payload?.items) ? payload.items : [];
          allItems.push(...items);
        });

        const dailyResponse = await dailyRequest;
        const dailyPayload = (await parseJson(dailyResponse)) as DailyApiResponse | null;

        if (!dailyResponse.ok) {
          throw new Error(getErrorMessage(dailyPayload, "Failed to load daily problem."));
        }

        setProblems(allItems);
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(orderedProblems.length / displayPageSize)),
    [orderedProblems.length, displayPageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [difficultyFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pagedProblems = useMemo(() => {
    const startIndex = (currentPage - 1) * displayPageSize;
    return orderedProblems.slice(startIndex, startIndex + displayPageSize);
  }, [currentPage, displayPageSize, orderedProblems]);

  return {
    searchQuery,
    setSearchQuery,
    difficultyFilter,
    setDifficultyFilter,
    problems,
    orderedProblems: pagedProblems,
    filteredProblemsCount: orderedProblems.length,
    displayPageSize,
    currentPage,
    totalPages,
    setCurrentPage,
    dailyTitleSlug,
    problemsError,
    isProblemsLoading
  };
};
