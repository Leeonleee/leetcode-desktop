import { FormEvent, useMemo, useState } from "react";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type ApiCallResult = {
  title: string;
  status: number;
  body: JsonValue;
};

type Domain = "com" | "cn";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export default function App() {
  const [domain, setDomain] = useState<Domain>("com");
  const [cookie, setCookie] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [lastResult, setLastResult] = useState<ApiCallResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const [problemQuery, setProblemQuery] = useState("");
  const [problemSlug, setProblemSlug] = useState("two-sum");
  const [runSlug, setRunSlug] = useState("two-sum");
  const [questionId, setQuestionId] = useState("1");
  const [language, setLanguage] = useState("python3");
  const [code, setCode] = useState("class Solution:\n    def twoSum(self, nums, target):\n        return []\n");
  const [dataInput, setDataInput] = useState("[2,7,11,15]\n9");
  const [submissionId, setSubmissionId] = useState("");

  const authHeader = useMemo(() => {
    if (!sessionToken.trim()) {
      return null;
    }

    return `Bearer ${sessionToken.trim()}`;
  }, [sessionToken]);

  async function callApi(
    title: string,
    path: string,
    init?: {
      method?: string;
      body?: Record<string, unknown>;
      requireAuth?: boolean;
    }
  ) {
    if (init?.requireAuth && !authHeader) {
      setLastResult({
        title,
        status: 0,
        body: { error: "Set a session token first (login endpoint returns one)." }
      });
      return;
    }

    setLoading(title);

    try {
      const response = await fetch(path, {
        method: init?.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: init?.body ? JSON.stringify(init.body) : undefined
      });

      const text = await response.text();
      const body = text ? (JSON.parse(text) as JsonValue) : null;

      setLastResult({
        title,
        status: response.status,
        body
      });

      if (title === "POST /api/auth/login" && response.ok) {
        const token =
          typeof body === "object" &&
          body !== null &&
          "sessionToken" in body &&
          typeof body.sessionToken === "string"
            ? body.sessionToken
            : "";

        if (token) {
          setSessionToken(token);
        }
      }

      if (
        (title === "POST /api/problems/:titleSlug/run" ||
          title === "POST /api/problems/:titleSlug/submit") &&
        response.ok
      ) {
        const maybeId =
          typeof body === "object" && body !== null
            ? (body as { runId?: string; submissionId?: string }).runId ||
              (body as { runId?: string; submissionId?: string }).submissionId ||
              ""
            : "";

        if (maybeId) {
          setSubmissionId(maybeId);
        }
      }
    } catch (error) {
      setLastResult({
        title,
        status: 0,
        body: { error: error instanceof Error ? error.message : "Unknown error" }
      });
    } finally {
      setLoading(null);
    }
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await callApi("POST /api/auth/login", "/api/auth/login", {
      method: "POST",
      body: { cookie, domain }
    });
  }

  return (
    <main className="page">
      <header className="hero">
        <h1>LeetCode Desktop API Playground</h1>
        <p>
          Placeholder UI to test backend endpoints before building the final desktop experience.
        </p>
      </header>

      <section className="card">
        <h2>Auth</h2>
        <form onSubmit={onLogin} className="stack">
          <label>
            Domain
            <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
              <option value="com">leetcode.com</option>
              <option value="cn">leetcode.cn</option>
            </select>
          </label>
          <label>
            Cookie Header
            <textarea
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              rows={4}
              placeholder="csrftoken=...; LEETCODE_SESSION=...; ..."
            />
          </label>
          <div className="row">
            <button type="submit" disabled={loading !== null}>
              {loading === "POST /api/auth/login" ? "Loading..." : "POST /api/auth/login"}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => callApi("GET /api/auth/me", "/api/auth/me", { requireAuth: true })}
            >
              GET /api/auth/me
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi("POST /api/auth/logout", "/api/auth/logout", {
                  method: "POST",
                  requireAuth: true
                })
              }
            >
              POST /api/auth/logout
            </button>
          </div>
        </form>

        <label>
          Session Token
          <input
            value={sessionToken}
            onChange={(e) => setSessionToken(e.target.value)}
            placeholder="Auto-filled after login"
          />
        </label>
      </section>

      <section className="card">
        <h2>Problems</h2>
        <div className="stack">
          <div className="row">
            <input
              value={problemQuery}
              onChange={(e) => setProblemQuery(e.target.value)}
              placeholder="Search query"
            />
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi(
                  "GET /api/problems",
                  `/api/problems?search=${encodeURIComponent(problemQuery)}&page=1&pageSize=20`,
                  { requireAuth: true }
                )
              }
            >
              GET /api/problems
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => callApi("GET /api/problems/daily", "/api/problems/daily", { requireAuth: true })}
            >
              GET /api/problems/daily
            </button>
          </div>

          <div className="row">
            <input
              value={problemSlug}
              onChange={(e) => setProblemSlug(e.target.value)}
              placeholder="titleSlug"
            />
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi(
                  "GET /api/problems/:titleSlug",
                  `/api/problems/${encodeURIComponent(problemSlug)}`,
                  { requireAuth: true }
                )
              }
            >
              GET /api/problems/:titleSlug
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Run / Submit / Check</h2>
        <div className="stack">
          <div className="grid2">
            <label>
              titleSlug
              <input value={runSlug} onChange={(e) => setRunSlug(e.target.value)} />
            </label>
            <label>
              questionId
              <input value={questionId} onChange={(e) => setQuestionId(e.target.value)} />
            </label>
          </div>

          <label>
            language
            <input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </label>

          <label>
            typedCode
            <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={6} />
          </label>

          <label>
            dataInput (for run)
            <textarea value={dataInput} onChange={(e) => setDataInput(e.target.value)} rows={3} />
          </label>

          <div className="row">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi(
                  "POST /api/problems/:titleSlug/run",
                  `/api/problems/${encodeURIComponent(runSlug)}/run`,
                  {
                    method: "POST",
                    requireAuth: true,
                    body: {
                      lang: language,
                      questionId,
                      typedCode: code,
                      dataInput
                    }
                  }
                )
              }
            >
              POST /api/problems/:titleSlug/run
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi(
                  "POST /api/problems/:titleSlug/submit",
                  `/api/problems/${encodeURIComponent(runSlug)}/submit`,
                  {
                    method: "POST",
                    requireAuth: true,
                    body: {
                      lang: language,
                      questionId,
                      typedCode: code
                    }
                  }
                )
              }
            >
              POST /api/problems/:titleSlug/submit
            </button>
          </div>

          <div className="row">
            <input
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              placeholder="submission/run id"
            />
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi(
                  "GET /api/submissions/:id/check",
                  `/api/submissions/${encodeURIComponent(submissionId)}/check`,
                  {
                    requireAuth: true
                  }
                )
              }
            >
              GET /api/submissions/:id/check
            </button>
          </div>

          <div className="row">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi(
                  "GET /api/problems/:questionId/submissions/latest",
                  `/api/problems/${encodeURIComponent(questionId)}/submissions/latest?lang=${encodeURIComponent(language)}`,
                  {
                    requireAuth: true
                  }
                )
              }
            >
              GET /api/problems/:questionId/submissions/latest
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Local Code Storage</h2>
        <div className="stack">
          <div className="row">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi("PUT /api/code/:titleSlug", `/api/code/${encodeURIComponent(runSlug)}`, {
                  method: "PUT",
                  body: {
                    lang: language,
                    code
                  }
                })
              }
            >
              PUT /api/code/:titleSlug
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                callApi(
                  "GET /api/code/:titleSlug",
                  `/api/code/${encodeURIComponent(runSlug)}?lang=${encodeURIComponent(language)}`
                )
              }
            >
              GET /api/code/:titleSlug
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => callApi("GET /api/code", "/api/code")}
            >
              GET /api/code
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Health</h2>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => callApi("GET /api/health", "/api/health")}
        >
          GET /api/health
        </button>
      </section>

      <section className="card">
        <h2>Last Response</h2>
        <p>
          <strong>Endpoint:</strong> {lastResult?.title || "(none)"}
        </p>
        <p>
          <strong>Status:</strong> {lastResult ? String(lastResult.status) : "(none)"}
        </p>
        <pre>{lastResult ? pretty(lastResult.body) : "No request yet"}</pre>
      </section>
    </main>
  );
}
