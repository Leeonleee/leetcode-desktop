import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { ChevronRight, GripVertical } from "lucide-react";

import { cn } from "../../lib/utils";
import { getDifficultyClasses } from "../../lib/app-helpers";
import { Button } from "../ui/button";
import type { Problem, QuestionDetail, QuestionApiResponse } from "../../types/app";

const monacoLanguageMap: Record<string, string> = {
  csharp: "csharp",
  golang: "go",
  mysql: "sql",
  mssql: "sql",
  oraclesql: "sql",
  postgresql: "sql",
  python3: "python",
  pandas: "python"
};

type WorkspaceProps = {
  problem: Problem | null;
  isDarkMode: boolean;
  sessionToken: string | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

function toMonacoLanguage(langSlug: string) {
  return monacoLanguageMap[langSlug] ?? langSlug;
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export const Workspace = ({
  problem,
  isDarkMode,
  sessionToken,
  isSidebarOpen,
  onToggleSidebar
}: WorkspaceProps) => {
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [questionError, setQuestionError] = useState("");
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [editorValue, setEditorValue] = useState("");
  const [editorError, setEditorError] = useState("");
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastLoadedRef = useRef("");
  const [splitPercent, setSplitPercent] = useState(52);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  const languageOptions = useMemo(() => {
    const snippets = question?.codeSnippets ?? [];
    const seen = new Set<string>();
    return snippets
      .filter((snippet) => {
        if (seen.has(snippet.langSlug)) {
          return false;
        }
        seen.add(snippet.langSlug);
        return true;
      })
      .map((snippet) => ({
        label: snippet.lang,
        value: snippet.langSlug
      }));
  }, [question]);

  const templateCode = useMemo(() => {
    if (!question || !selectedLanguage) {
      return null;
    }
    return question.codeSnippets?.find((item) => item.langSlug === selectedLanguage)?.code ?? "";
  }, [question, selectedLanguage]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop("matches" in event ? event.matches : event.matches);
    };

    handleChange(mediaQuery);
    const listener = (event: MediaQueryListEvent) => handleChange(event);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const position = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(70, Math.max(30, position));
      setSplitPercent(clamped);
    };

    const handleUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  useEffect(() => {
    if (!problem) {
      setQuestion(null);
      setQuestionError("");
      setSelectedLanguage("");
      setEditorValue("");
      setEditorError("");
      setIsDirty(false);
      setIsSaving(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setIsQuestionLoading(true);
    setQuestion(null);
    setQuestionError("");
    setSelectedLanguage("");
    setEditorValue("");
    setEditorError("");
    setIsDirty(false);
    setIsSaving(false);

    const loadQuestion = async () => {
      try {
        const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;
        const response = await fetch(`/api/problems/${problem.titleSlug}`, {
          signal: controller.signal,
          headers
        });

        if (!response.ok) {
          const payload = await readJsonSafely(response);
          throw new Error(payload?.message || "Failed to load question.");
        }

        const payload = (await response.json()) as QuestionApiResponse;
        if (!payload.question) {
          throw new Error("Question details were not found.");
        }

        if (!isActive) {
          return;
        }

        setQuestion(payload.question);
        setIsQuestionLoading(false);
      } catch (error) {
        if (!isActive) {
          return;
        }
        if ((error as Error).name === "AbortError") {
          return;
        }
        setQuestionError((error as Error).message || "Failed to load question.");
        setIsQuestionLoading(false);
      }
    };

    loadQuestion();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [problem, sessionToken]);

  useEffect(() => {
    if (!problem || !question || !selectedLanguage) {
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setIsEditorLoading(true);
    setEditorError("");
    setIsDirty(false);

    const loadCode = async () => {
      try {
        const response = await fetch(
          `/api/code/${problem.titleSlug}?lang=${encodeURIComponent(selectedLanguage)}`,
          { signal: controller.signal }
        );

        if (response.ok) {
          const payload = await response.json();
          if (!isActive) {
            return;
          }
          const code = typeof payload.code === "string" ? payload.code : "";
          lastLoadedRef.current = code;
          setEditorValue(code);
          setIsEditorLoading(false);
          setIsDirty(false);
          return;
        }

        if (response.status === 404) {
          const snippet =
            question.codeSnippets?.find((item) => item.langSlug === selectedLanguage)?.code || "";
          if (!isActive) {
            return;
          }
          lastLoadedRef.current = snippet;
          setEditorValue(snippet);
          setIsEditorLoading(false);
          setIsDirty(false);

          if (snippet) {
            await fetch(`/api/code/${problem.titleSlug}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lang: selectedLanguage,
                code: snippet
              })
            });
          }
          return;
        }

        const payload = await readJsonSafely(response);
        throw new Error(payload?.message || "Failed to load code file.");
      } catch (error) {
        if (!isActive) {
          return;
        }
        if ((error as Error).name === "AbortError") {
          return;
        }
        setEditorError((error as Error).message || "Failed to load code file.");
        setIsEditorLoading(false);
      }
    };

    loadCode();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [problem, question, selectedLanguage]);

  useEffect(() => {
    if (!selectedLanguage) {
      lastLoadedRef.current = "";
      setEditorValue("");
      setIsDirty(false);
      setIsSaving(false);
      setEditorError("");
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (!problem || !question || !selectedLanguage || !isDirty) {
      return;
    }

    const valueToSave = editorValue;
    const titleSlug = problem.titleSlug;

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        const response = await fetch(`/api/code/${titleSlug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lang: selectedLanguage,
            code: valueToSave
          })
        });

        if (!response.ok) {
          const payload = await readJsonSafely(response);
          throw new Error(payload?.message || "Failed to save code.");
        }

        if (editorValue === valueToSave) {
          lastLoadedRef.current = valueToSave;
          setIsDirty(false);
        }
      } catch (error) {
        setEditorError((error as Error).message || "Failed to save code.");
      } finally {
        setIsSaving(false);
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [editorValue, isDirty, problem, question, selectedLanguage]);

  if (!problem) {
    return (
      <section className="relative flex flex-1 items-center justify-center bg-background/70">
        {!isSidebarOpen ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="absolute left-4 top-4 rounded-full border border-border/70 bg-background/80 p-2 text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Open sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
        <div className="rounded-3xl border border-dashed border-border/70 bg-card/80 px-10 py-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
          <h2 className="mt-3 text-2xl font-semibold">Select a problem to get started</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Choose a question from the sidebar to open its details and start coding locally.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen min-w-0 flex-1 flex-col bg-background/70 lg:flex-row"
    >
      {!isSidebarOpen ? (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="absolute left-4 top-4 z-10 rounded-full border border-border/70 bg-background/80 p-2 text-muted-foreground transition-colors hover:bg-accent"
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={isDesktop ? { flexBasis: `${splitPercent}%` } : undefined}
      >
        <div className="border-b border-border/70 px-6 py-5">
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">{problem.title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              #{problem.frontendId}
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                getDifficultyClasses(problem.difficulty)
              )}
            >
              {problem.difficulty}
            </span>
          </div>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {isQuestionLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
              Loading question details...
            </div>
          ) : null}

          {!isQuestionLoading && questionError ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-700 dark:text-rose-300">
              {questionError}
            </div>
          ) : null}

          {!isQuestionLoading && !questionError ? (
            <div
              className="space-y-4 text-sm leading-6 text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_img]:max-w-full [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-background/70 [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: question?.content || "" }}
            />
          ) : null}
        </div>
      </div>

      <div
        className="hidden w-2 flex-shrink-0 cursor-col-resize items-center justify-center lg:flex"
        onMouseDown={() => setIsDragging(true)}
        aria-label="Resize panels"
        role="separator"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="h-full w-px bg-border/80" />
          <span className="absolute flex h-6 w-6 items-center justify-center text-muted-foreground">
            <GripVertical className="h-3 w-3" />
          </span>
        </div>
      </div>
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={isDesktop ? { flexBasis: `${100 - splitPercent}%` } : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Editor</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedLanguage
                ? `Editing ${selectedLanguage}`
                : "Select a language to open its local file."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={
                !selectedLanguage || isQuestionLoading || isEditorLoading || templateCode === null
              }
              onClick={() => {
                const nextValue = templateCode ?? "";
                setEditorValue(nextValue);
                setIsDirty(true);
                setEditorError("");
              }}
            >
              Reset
            </Button>
            {isSaving ? (
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                Saving...
              </span>
            ) : null}
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Language</span>
              <select
                className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm"
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value)}
                disabled={isQuestionLoading || languageOptions.length === 0}
              >
                <option value="">Select</option>
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <Editor
            height="100%"
            language={selectedLanguage ? toMonacoLanguage(selectedLanguage) : "plaintext"}
            theme={isDarkMode ? "vs-dark" : "vs"}
            value={editorValue}
            onChange={(value) => {
              const nextValue = value ?? "";
              setEditorValue(nextValue);
              if (nextValue !== lastLoadedRef.current) {
                setIsDirty(true);
              }
            }}
            options={{
              readOnly: !selectedLanguage,
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "IBM Plex Mono, Menlo, Monaco, Consolas, monospace",
              smoothScrolling: true,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              renderWhitespace: "selection",
              automaticLayout: true
            }}
            loading={
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading editor...
              </div>
            }
          />

          {!selectedLanguage ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/80 px-6 py-4 text-center">
                <p className="text-sm font-medium">No file open</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Pick a language to open its local solution file.
                </p>
              </div>
            </div>
          ) : null}

          {isEditorLoading ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/80 px-6 py-4 text-center">
                <p className="text-sm font-medium">Opening local file...</p>
                <p className="mt-2 text-xs text-muted-foreground">Loading saved solution.</p>
              </div>
            </div>
          ) : null}
        </div>

        {editorError ? (
          <div className="border-t border-border/70 bg-rose-500/10 px-6 py-3 text-sm text-rose-700 dark:text-rose-300">
            {editorError}
          </div>
        ) : null}
      </div>
    </section>
  );
};
