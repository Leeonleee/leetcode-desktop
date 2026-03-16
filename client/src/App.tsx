import { FormEvent, useEffect, useState } from "react";
import { LogOut, Moon, ShieldCheck, Sun, X } from "lucide-react";

import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { Textarea } from "./components/ui/textarea";

type Domain = "com" | "cn";
type Theme = "light" | "dark";

type LoginApiResponse = {
  sessionToken?: string;
  user?: {
    username?: string;
    slug?: string;
  };
  message?: string;
};

const THEME_KEY = "leetcode-desktop-theme";

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

export default function App() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [domain, setDomain] = useState<Domain>("com");
  const [cookie, setCookie] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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
      setIsLoggingOut(false);
      setSessionToken(null);
      setUsername("");
    }
  };

  const isDarkMode = theme === "dark";

  return (
    <div className="min-h-full">
      {!sessionToken ? (
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
        <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
          <Card className="animate-fade-up border-border/90 bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5" />
                Logged in
              </CardTitle>
              <CardDescription>This is a placeholder page after successful auth.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border bg-muted p-4 text-sm">
                Welcome {username}. Problem list and editor screens are coming next.
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-preview">Session Token</Label>
                <Input
                  id="session-preview"
                  value={sessionToken}
                  readOnly
                  className="font-mono text-xs"
                  aria-readonly
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:flex-1"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
              <Button type="button" className="w-full sm:flex-1" onClick={handleExit}>
                <X className="mr-2 h-4 w-4" />
                Exit
              </Button>
            </CardFooter>
          </Card>
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
          </Card>
        </div>
      ) : null}
    </div>
  );
}
