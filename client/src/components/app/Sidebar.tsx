import { useEffect, useState } from "react";
import { Flame, LogOut, Moon, Search, Sun } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { cn } from "../../lib/utils";
import { difficultyFilters } from "../../lib/app-constants";
import { getDifficultyClasses } from "../../lib/app-helpers";
import { DifficultyFilter, Problem } from "../../types/app";

type SidebarProps = {
  username: string;
  orderedProblems: Problem[];
  filteredProblemsCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  dailyTitleSlug: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  difficultyFilter: DifficultyFilter;
  onDifficultyChange: (filter: DifficultyFilter) => void;
  isProblemsLoading: boolean;
  problemsError: string;
  isDarkMode: boolean;
  onToggleTheme: (checked: boolean) => void;
  onLogout: () => void;
  isLoggingOut: boolean;
};

export const Sidebar = ({
  username,
  orderedProblems,
  filteredProblemsCount,
  currentPage,
  totalPages,
  onPageChange,
  dailyTitleSlug,
  searchQuery,
  onSearchChange,
  difficultyFilter,
  onDifficultyChange,
  isProblemsLoading,
  problemsError,
  isDarkMode,
  onToggleTheme,
  onLogout,
  isLoggingOut
}: SidebarProps) => {
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    if (!isEditingPage) {
      setPageInput(String(currentPage));
    }
  }, [currentPage, isEditingPage]);

  const commitPage = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      setIsEditingPage(false);
      setPageInput(String(currentPage));
      return;
    }

    const nextPage = Math.min(Math.max(parsed, 1), totalPages);
    setIsEditingPage(false);
    setPageInput(String(nextPage));
    if (nextPage !== currentPage) {
      onPageChange(nextPage);
    }
  };

  const cancelEdit = () => {
    setIsEditingPage(false);
    setPageInput(String(currentPage));
  };

  return (
    <aside className="flex h-screen w-full max-w-md flex-col border-r border-border/80 bg-card/80 backdrop-blur sm:w-[30rem]">
    <div className="border-b border-border/70 px-4 py-5 sm:px-5">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Home</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {username}.</p>
          </div>
          <div className="rounded-full border border-border/80 bg-background px-3 py-1 text-xs text-muted-foreground">
            {orderedProblems.length} of {filteredProblemsCount}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title or number"
          className="h-11 rounded-xl pl-10"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {difficultyFilters.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={difficultyFilter === filter ? "default" : "outline"}
            className="rounded-full"
            onClick={() => onDifficultyChange(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>
    </div>

    <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
      {isProblemsLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
          Loading problems...
        </div>
      ) : null}

      {!isProblemsLoading && problemsError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-700 dark:text-rose-300">
          {problemsError}
        </div>
      ) : null}

      {!isProblemsLoading && !problemsError && orderedProblems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
          No problems match the current search and filters.
        </div>
      ) : null}

      {!isProblemsLoading && !problemsError ? (
        <div className="space-y-2">
          {orderedProblems.map((problem) => {
            const isDaily = problem.titleSlug === dailyTitleSlug;

            return (
              <button
                key={problem.titleSlug}
                type="button"
                className={cn(
                  "flex w-full flex-col gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                  isDaily
                    ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15"
                    : "border-border/70 bg-background/70 hover:bg-accent"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isDaily ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          <Flame className="h-3.5 w-3.5" />
                          Daily
                        </span>
                      ) : null}
                      <span className="text-xs font-medium text-muted-foreground">#{problem.frontendId}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-foreground">{problem.title}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium",
                      getDifficultyClasses(problem.difficulty)
                    )}
                  >
                    {problem.difficulty}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>

    <div className="border-t border-border/70 px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Page</span>
          {isEditingPage ? (
            <Input
              type="number"
              min={1}
              max={totalPages}
              step={1}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitPage(pageInput);
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEdit();
                }
              }}
              onBlur={() => commitPage(pageInput)}
              onFocus={(event) => event.currentTarget.select()}
              autoFocus
              className="h-7 w-16 rounded-md border-border/60 bg-transparent px-2 text-xs text-center shadow-none focus-visible:ring-1 focus-visible:ring-ring/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Go to page"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingPage(true)}
              className="rounded px-1 font-medium text-foreground transition-colors hover:bg-accent"
            >
              {currentPage}
            </button>
          )}
          <span>of {totalPages}</span>
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>

    <div className="border-t border-border/70 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border/80 p-2">
            {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-medium">Dark mode</p>
            <p className="text-xs text-muted-foreground">{isDarkMode ? "Enabled" : "Disabled"}</p>
          </div>
        </div>
        <Switch checked={isDarkMode} onCheckedChange={onToggleTheme} aria-label="Toggle dark mode" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-3 h-11 w-full justify-center rounded-xl"
        onClick={onLogout}
        disabled={isLoggingOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isLoggingOut ? "Logging out..." : "Logout"}
      </Button>
    </div>
  </aside>
  );
};
