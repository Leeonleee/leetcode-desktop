import { FormEvent, useMemo, useState } from "react";

type AuthSuccess = {
  ok: true;
  domain: "com" | "cn";
  user: {
    id: number | null;
    slug: string | null;
    username: string | null;
    isPremium: boolean;
    isVerified: boolean;
    activeSessionId: number | null;
  };
};

type AuthError = {
  ok: false;
  status?: number;
  message: string;
  details?: string;
};

export default function App() {
  const [cookie, setCookie] = useState("");
  const [domain, setDomain] = useState<"com" | "cn">("com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuthSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cookiePreview = useMemo(() => {
    if (!cookie) return "";
    return cookie.length > 80 ? `${cookie.slice(0, 80)}...` : cookie;
  }, [cookie]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/auth/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cookie, domain })
      });

      const data = (await response.json()) as AuthSuccess | AuthError;

      if (!response.ok || !data.ok) {
        const details = "details" in data && data.details ? `\n${data.details}` : "";
        throw new Error(`${data.message}${details}`.trim());
      }

      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card">
        <h1>LeetCode Cookie Auth Check</h1>
        <p className="help">
          Paste the full <code>Cookie</code> header value from browser request headers. Do not
          use <code>set-cookie</code> response headers.
        </p>

        <form onSubmit={onSubmit}>
          <label>
            Domain
            <select value={domain} onChange={(e) => setDomain(e.target.value as "com" | "cn")}> 
              <option value="com">leetcode.com</option>
              <option value="cn">leetcode.cn</option>
            </select>
          </label>

          <label>
            Cookie Header Value
            <textarea
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="csrftoken=...; LEETCODE_SESSION=...; ..."
              rows={10}
              required
            />
          </label>

          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setCookie("");
                setError(null);
                setResult(null);
              }}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </form>

        {cookiePreview && (
          <p className="preview">
            <strong>Cookie preview:</strong> {cookiePreview}
          </p>
        )}

        {error && <pre className="error">{error}</pre>}

        {result && (
          <div className="result">
            <h2>Connection Successful</h2>
            <ul>
              <li>
                <strong>Domain:</strong> leetcode.{result.domain}
              </li>
              <li>
                <strong>Username:</strong> {result.user.username || "(none)"}
              </li>
              <li>
                <strong>User slug:</strong> {result.user.slug || "(none)"}
              </li>
              <li>
                <strong>User id:</strong> {result.user.id ?? "(none)"}
              </li>
              <li>
                <strong>Premium:</strong> {String(result.user.isPremium)}
              </li>
              <li>
                <strong>Verified email:</strong> {String(result.user.isVerified)}
              </li>
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
