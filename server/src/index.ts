import cors from "cors";
import express from "express";

type Domain = "com" | "cn";

type UserStatus = {
  userId: number | null;
  userSlug: string | null;
  username: string | null;
  isSignedIn: boolean;
  isPremium: boolean;
  isVerified: boolean;
  activeSessionId: number | null;
};

type AuthResult =
  | {
      ok: true;
      user: UserStatus;
      domain: Domain;
    }
  | {
      ok: false;
      status: number;
      message: string;
      details?: string;
    };

const USER_STATUS_QUERY = `
  query globalData {
    userStatus {
      userId
      userSlug
      username
      isSignedIn
      isPremium
      isVerified
      activeSessionId
    }
  }
`;

function readCookieValue(cookieHeader: string, key: string): string | null {
  const match = cookieHeader.match(new RegExp(`${key}=([^;]+)`));
  return match?.[1]?.trim() || null;
}

async function testLeetCodeAuth(cookie: string, domain: Domain): Promise<AuthResult> {
  const csrfToken = readCookieValue(cookie, "csrftoken");
  const sessionToken = readCookieValue(cookie, "LEETCODE_SESSION");

  if (!csrfToken) {
    return {
      ok: false,
      status: 400,
      message: "Missing csrftoken in cookie string"
    };
  }

  if (!sessionToken) {
    return {
      ok: false,
      status: 400,
      message: "Missing LEETCODE_SESSION in cookie string"
    };
  }

  const leetcodeHost = `leetcode.${domain}`;
  const url = `https://${leetcodeHost}/graphql/`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: `https://${leetcodeHost}`,
        Origin: `https://${leetcodeHost}/`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Host: leetcodeHost,
        Cookie: cookie,
        "x-csrftoken": csrfToken
      },
      body: JSON.stringify({
        query: USER_STATUS_QUERY,
        variables: {}
      }),
      signal: controller.signal
    });

    const bodyText = await response.text();

    let body: {
      data?: { userStatus?: UserStatus | null };
      errors?: Array<{ message?: string }>;
      error?: string;
    };

    try {
      body = JSON.parse(bodyText) as typeof body;
    } catch {
      return {
        ok: false,
        status: 502,
        message: "LeetCode returned non-JSON response",
        details: bodyText.slice(0, 300)
      };
    }

    if (!response.ok) {
      const details = body.errors?.map((err) => err.message).filter(Boolean).join("\n");
      return {
        ok: false,
        status: response.status,
        message: `LeetCode request failed with status ${response.status}`,
        details
      };
    }

    if (body.error || body.errors?.length) {
      const details = [body.error, ...(body.errors?.map((err) => err.message || "") || [])]
        .filter(Boolean)
        .join("\n");

      return {
        ok: false,
        status: 502,
        message: "LeetCode GraphQL returned errors",
        details
      };
    }

    const userStatus = body.data?.userStatus;
    if (!userStatus) {
      return {
        ok: false,
        status: 502,
        message: "Could not read userStatus from LeetCode response"
      };
    }

    const hasIdentity = userStatus.userId !== null || userStatus.userSlug !== null;
    if (!hasIdentity || !userStatus.isSignedIn) {
      return {
        ok: false,
        status: 401,
        message: "Cookie looks invalid or expired"
      };
    }

    return {
      ok: true,
      user: userStatus,
      domain
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      status: 502,
      message: "Failed to reach LeetCode",
      details: message
    };
  } finally {
    clearTimeout(timeout);
  }
}

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: frontendOrigin
  })
);
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.post("/api/auth/test", async (req, res) => {
  const cookie = typeof req.body?.cookie === "string" ? req.body.cookie.trim() : "";
  const domain: Domain = req.body?.domain === "cn" ? "cn" : "com";

  if (!cookie) {
    res.status(400).json({
      ok: false,
      message: "Please paste the full Cookie header value"
    });
    return;
  }

  const result = await testLeetCodeAuth(cookie, domain);

  if (!result.ok) {
    res.status(result.status).json(result);
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    domain: result.domain,
    user: {
      id: result.user.userId,
      slug: result.user.userSlug,
      username: result.user.username,
      isPremium: result.user.isPremium,
      isVerified: result.user.isVerified,
      activeSessionId: result.user.activeSessionId
    }
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
