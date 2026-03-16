import { FormEvent, useEffect, useState } from "react";

import { getErrorMessage, parseJson } from "../lib/app-helpers";
import { AuthBootstrapState, Domain, LoginApiResponse } from "../types/app";

export const useAuth = () => {
  const [domain, setDomain] = useState<Domain>("com");
  const [cookie, setCookie] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [authBootstrapState, setAuthBootstrapState] = useState<AuthBootstrapState>("checking");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  return {
    domain,
    setDomain,
    cookie,
    setCookie,
    sessionToken,
    username,
    authBootstrapState,
    isLoginModalOpen,
    errorMessage,
    isSubmitting,
    isLoggingOut,
    openLoginModal,
    closeLoginModal,
    handleLogin,
    handleLogout,
    handleExit
  };
};
