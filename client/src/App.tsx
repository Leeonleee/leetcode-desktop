import { FormEvent, useEffect, useMemo, useState } from "react";
import { Flame, LogOut, Moon, Search, ShieldCheck, Sun, X } from "lucide-react";

import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { Textarea } from "./components/ui/textarea";
import { cn } from "./lib/utils";

type Domain = "com" | "cn";
type Theme = "light" | "dark";
type DifficultyFilter = "All" | "Easy" | "Medium" | "Hard";
type AuthBootstrapState = "checking" | "ready";

type User = {
  username?: string;
  slug?: string;
};

type Problem = {
  id: number;
  frontendId: string;
  title: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "ac" | "notac" | "todo";
  paidOnly: boolean;
  starred: boolean;
  acRate: number;
  link: string;
};

type LoginApiResponse = {
  sessionToken?: string;
  user?: User;
  message?: string;
};

type ProblemsApiResponse = {
  items?: Problem[];
  message?: string;
};

type DailyApiResponse = {
  daily?: {
    titleSlug?: string;
  };
  message?: string;
};

const THEME_KEY = "leetcode-desktop-theme";
const difficultyFilters: DifficultyFilter[] = ["All", "Easy", "Medium", "Hard"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const parseJson = async (response: Response): Promise<unknown> => {
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

const getErrorMessage = (payload: unknown, fallback: string): string => {
  if (isRecord(payload) && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
};

const getDifficultyClasses = (difficulty: Problem["difficulty"]) => {
  if (difficulty === "Easy") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (difficulty === "Medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [domain, setDomain] = useState<Domain>("com");
  const [cookie, setCookie] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [authBootstrapState, setAuthBootstrapState] = useState<AuthBootstrapState>("checking");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("All");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [dailyTitleSlug, setDailyTitleSlug] = useState<string | null>(null);
  const [problemsError, setProblemsError] = useState("");
  const [isProblemsLoading, setIsProblemsLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    const tryAutoLogin = async () => {
      const authCache = window.authCache;
      if (!authCache) {
        if (!cancelled) {
          setAuthBootstrapState("ready");
        }
        return;
      }

      try {
        const cachedAuth = await authCache.read();

        if (!cachedAuth) {
          if (!cancelled) {
            setAuthBootstrapState("ready");
          }
          return;
        }

        if (!cancelled) {
          setDomain(cachedAuth.domain);
        }

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(cachedAuth)
        });

        const payload = (await parseJson(response)) as LoginApiResponse | null;
        if (!response.ok) {
          await authCache.clear();
          if (!cancelled) {
            setAuthBootstrapState("ready");
          }
          return;
        }

        const token = payload?.sessionToken?.trim();
        if (!token) {
          await authCache.clear();
          if (!cancelled) {
            setAuthBootstrapState("ready");
          }
          return;
        }

        if (!cancelled) {
          setSessionToken(token);
          setUsername(payload?.user?.username || payload?.user?.slug || "LeetCode User");
          setAuthBootstrapState("ready");
        }
      } catch {
        if (!cancelled) {
          setAuthBootstrapState("ready");
        }
      }
    };

    void tryAutoLogin();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoginModalOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setIsLoginModalOpen(false);
        setErrorMessage("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoginModalOpen, isSubmitting]);

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

  const handleExit = () => {
    window.close();
  };

  const openLoginModal = () => {
    setErrorMessage("");
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsLoginModalOpen(false);
    setErrorMessage("");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const normalizedCookie = cookie.trim();
    if (!normalizedCookie) {
      setErrorMessage("Paste your full LeetCode cookie header before logging in.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cookie: normalizedCookie, domain })
      });

      const payload = (await parseJson(response)) as LoginApiResponse | null;
      if (!response.ok) {
        setErrorMessage(getErrorMessage(payload, "Login failed. Verify the cookie header and try again."));
        return;
      }

      const token = payload?.sessionToken?.trim();
      if (!token) {
        setErrorMessage("Login succeeded but no session token was returned by the backend.");
        return;
      }

      setSessionToken(token);
      setUsername(payload?.user?.username || payload?.user?.slug || "LeetCode User");
      setCookie("");
      setIsLoginModalOpen(false);

      try {
        await window.authCache?.write({ cookie: normalizedCookie, domain });
      } catch {
        // Login should still succeed even if local cache persistence fails.
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to reach backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setErrorMessage("");
    setIsLoggingOut(true);

    try {
      if (sessionToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`
          }
        });
      }
    } finally {
      try {
        await window.authCache?.clear();
      } catch {
        // Logging out should still clear in-memory auth state.
      }

      setIsLoggingOut(false);
      setSessionToken(null);
      setUsername("");
    }
  };

  const isDarkMode = theme === "dark";

  const filteredProblems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return problems.filter((problem) => {
      const matchesDifficulty = difficultyFilter === "All" || problem.difficulty === difficultyFilter;
      const matchesSearch =
        !normalizedQuery ||
        problem.title.toLowerCase().includes(normalizedQuery) ||
        problem.titleSlug.toLowerCase().includes(normalizedQuery) ||
        problem.frontendId.toLowerCase().includes(normalizedQuery);

      return matchesDifficulty && matchesSearch;
    });
  }, [difficultyFilter, problems, searchQuery]);

  const orderedProblems = useMemo(() => {
    const dailyProblem = filteredProblems.find((problem) => problem.titleSlug === dailyTitleSlug);
    const remainingProblems = filteredProblems.filter((problem) => problem.titleSlug !== dailyTitleSlug);

    return dailyProblem ? [dailyProblem, ...remainingProblems] : remainingProblems;
  }, [dailyTitleSlug, filteredProblems]);

  return (
    <div className="min-h-full">
      {authBootstrapState === "checking" ? (
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-3xl border border-border/80 bg-card/80 px-6 py-5 text-center shadow-sm backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Startup</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Checking saved session</h1>
            <p className="mt-2 text-sm text-muted-foreground">Trying cached LeetCode credentials before showing login.</p>
          </div>
        </main>
      ) : !sessionToken ? (
        <main className="relative min-h-screen">
          <section className="flex min-h-screen animate-fade-up items-center justify-center px-4">
            <div className="space-y-10 text-center">
              <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Leetcode Desktop</h1>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button type="button" size="lg" onClick={openLoginModal} className="h-14 min-w-44 text-lg">
                  Login
                </Button>
                <Button type="button" size="lg" variant="outline" onClick={handleExit} className="h-14 min-w-44 text-lg">
                  Exit
                </Button>
              </div>
            </div>
          </section>
          <footer className="pointer-events-none fixed inset-x-0 bottom-4 z-10 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-2 shadow-sm backdrop-blur">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={isDarkMode}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                aria-label="Toggle dark mode"
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </footer>
        </main>
      ) : (
        <main className="flex min-h-screen bg-background">
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
                    {orderedProblems.length} shown
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title, slug, or number"
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
                    onClick={() => setDifficultyFilter(filter)}
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
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
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  aria-label="Toggle dark mode"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-3 h-11 w-full justify-center rounded-xl"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </aside>

          <section className="hidden flex-1 items-center justify-center p-8 lg:flex">
            <div className="max-w-md rounded-3xl border border-dashed border-border/80 bg-card/40 px-8 py-10 text-center backdrop-blur-sm">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Editor area next</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                The home screen now has the problem browser sidebar. The main panel can be wired to question details in the next step.
              </p>
            </div>
          </section>
        </main>
      )}

      {isLoginModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
          <Card className="w-full max-w-xl border-border/90 bg-card shadow-xl">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-2xl">Login</CardTitle>
                <Button type="button" variant="ghost" size="icon" onClick={closeLoginModal} aria-label="Close login modal">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription>Select the domain and paste your cookie header.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={domain === "com" ? "default" : "outline"}
                      onClick={() => setDomain("com")}
                    >
                      leetcode.com
                    </Button>
                    <Button
                      type="button"
                      variant={domain === "cn" ? "default" : "outline"}
                      onClick={() => setDomain("cn")}
                    >
                      leetcode.cn
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cookie">Cookie Header</Label>
                  <Textarea
                    id="cookie"
                    value={cookie}
                    onChange={(event) => setCookie(event.target.value)}
                    placeholder="csrftoken=...; LEETCODE_SESSION=...; ..."
                    rows={8}
                  />
                </div>

                {errorMessage ? (
                  <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground/90">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="w-full sm:flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:flex-1"
                    onClick={closeLoginModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="button" variant="ghost" onClick={handleExit}>
                Exit app
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
