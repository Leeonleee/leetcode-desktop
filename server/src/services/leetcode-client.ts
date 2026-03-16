import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import type { Domain } from "../types/domain.js";
import type { SessionData, UserStatus } from "../types/session.js";
import { queries } from "./leetcode-queries.js";

type GraphQLError = { message?: string };

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: GraphQLError[];
  error?: string;
};

type ProblemListApiItem = {
  status: string | null;
  paid_only: boolean;
  is_favor: boolean;
  difficulty: { level: 1 | 2 | 3 };
  stat: {
    question_id: number;
    frontend_question_id: string;
    question__title: string;
    question__title_slug: string;
    total_acs: number;
    total_submitted: number;
    question__hide?: boolean;
  };
};

type ProblemsListResponse = {
  stat_status_pairs: ProblemListApiItem[];
};

function readCookieValue(cookieHeader: string, key: string): string | null {
  const match = cookieHeader.match(new RegExp(`${key}=([^;]+)`));
  return match?.[1]?.trim() || null;
}

function toLeetCodeHost(domain: Domain): string {
  return `leetcode.${domain}`;
}

function normalizeLeetCodeStatus(status: string | null): "ac" | "notac" | "todo" {
  if (!status) {
    return "todo";
  }

  if (status === "ac") {
    return "ac";
  }

  return "notac";
}

function difficultyFromLevel(level: 1 | 2 | 3): "Easy" | "Medium" | "Hard" {
  if (level === 1) {
    return "Easy";
  }

  if (level === 2) {
    return "Medium";
  }

  return "Hard";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  let json: T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    throw new HttpError(
      502,
      "LeetCode returned a non-JSON response",
      text.slice(0, 500)
    );
  }

  return json;
}

async function requestLeetCode<T>(
  domain: Domain,
  cookie: string,
  csrfToken: string,
  path: string,
  init: {
    method?: "GET" | "POST";
    body?: unknown;
  }
): Promise<T> {
  const host = toLeetCodeHost(domain);
  const url = `https://${host}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.upstreamTimeoutMs);

  try {
    const response = await fetch(url, {
      method: init.method || "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: `https://${host}`,
        Origin: `https://${host}/`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Host: host,
        Cookie: cookie,
        "x-csrftoken": csrfToken
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal
    });

    const body = await parseResponse<Record<string, unknown>>(response);

    if (!response.ok) {
      const details = [
        (body.error as string | undefined) || "",
        ...(((body.errors as GraphQLError[] | undefined) || []).map((entry) => entry.message || ""))
      ]
        .filter(Boolean)
        .join("\n");

      const message =
        response.status === 401 || response.status === 403
          ? "Cookie expired or unauthorized"
          : response.status === 429
            ? "LeetCode rate limit reached"
            : `LeetCode request failed with status ${response.status}`;

      throw new HttpError(response.status, message, details || undefined);
    }

    return body as T;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new HttpError(502, "Failed to reach LeetCode", message);
  } finally {
    clearTimeout(timeout);
  }
}

async function queryGraphQL<T>(
  domain: Domain,
  cookie: string,
  csrfToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  endpoint = "/graphql/"
): Promise<T> {
  const body = await requestLeetCode<GraphQLResponse<T>>(domain, cookie, csrfToken, endpoint, {
    method: "POST",
    body: { query, variables }
  });

  if (body.error || (body.errors && body.errors.length > 0)) {
    const details = [
      body.error || "",
      ...(body.errors?.map((entry) => entry.message || "") || [])
    ]
      .filter(Boolean)
      .join("\n");

    throw new HttpError(502, "LeetCode GraphQL returned errors", details || undefined);
  }

  if (!body.data) {
    throw new HttpError(502, "LeetCode GraphQL response is missing data");
  }

  return body.data;
}

function parseJsonIfPossible(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeQuestionPayload(rawQuestion: Record<string, unknown>) {
  return {
    ...rawQuestion,
    metaData: parseJsonIfPossible(rawQuestion.metaData),
    stats: parseJsonIfPossible(rawQuestion.stats)
  };
}

function normalizeProblemList(items: ProblemListApiItem[], domain: Domain) {
  return items
    .filter((item) => !item.stat.question__hide)
    .map((item) => {
      const acRate =
        item.stat.total_submitted > 0
          ? (item.stat.total_acs * 100) / item.stat.total_submitted
          : 0;

      return {
        id: item.stat.question_id,
        frontendId: item.stat.frontend_question_id,
        title: item.stat.question__title,
        titleSlug: item.stat.question__title_slug,
        difficulty: difficultyFromLevel(item.difficulty.level),
        status: normalizeLeetCodeStatus(item.status),
        paidOnly: item.paid_only,
        starred: item.is_favor,
        acRate,
        link: `https://leetcode.${domain}/problems/${item.stat.question__title_slug}/`
      };
    })
    .sort((a, b) => {
      const aNumber = Number(a.frontendId);
      const bNumber = Number(b.frontendId);
      const aNumeric = Number.isFinite(aNumber);
      const bNumeric = Number.isFinite(bNumber);

      if (aNumeric && bNumeric) {
        return aNumber - bNumber;
      }

      if (aNumeric) {
        return -1;
      }

      if (bNumeric) {
        return 1;
      }

      return a.frontendId.localeCompare(b.frontendId);
    });
}

function extractDailyTitleSlug(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = (payload as { todayRecord?: unknown }).todayRecord;

  if (Array.isArray(record) && record[0] && typeof record[0] === "object") {
    const question = (record[0] as { question?: { titleSlug?: string } }).question;
    return question?.titleSlug || null;
  }

  if (record && typeof record === "object") {
    const question = (record as { question?: { titleSlug?: string } }).question;
    return question?.titleSlug || null;
  }

  return null;
}

export const leetCodeClient = {
  parseCookie(cookie: string) {
    const csrfToken = readCookieValue(cookie, "csrftoken");
    const sessionToken = readCookieValue(cookie, "LEETCODE_SESSION");

    if (!csrfToken) {
      throw new HttpError(400, "Missing csrftoken in cookie string");
    }

    if (!sessionToken) {
      throw new HttpError(400, "Missing LEETCODE_SESSION in cookie string");
    }

    return { csrfToken, sessionToken };
  },

  async login(cookie: string, domain: Domain) {
    const { csrfToken } = this.parseCookie(cookie);

    const data = await queryGraphQL<{ userStatus: UserStatus | null }>(
      domain,
      cookie,
      csrfToken,
      queries.userStatus,
      {}
    );

    const user = data.userStatus;
    if (!user || !user.isSignedIn) {
      throw new HttpError(401, "Cookie looks invalid or expired");
    }

    return {
      csrfToken,
      user
    };
  },

  async fetchMe(session: SessionData) {
    const data = await queryGraphQL<{ userStatus: UserStatus | null }>(
      session.domain,
      session.cookie,
      session.csrfToken,
      queries.userStatus,
      {}
    );

    const user = data.userStatus;
    if (!user || !user.isSignedIn) {
      throw new HttpError(401, "Cookie looks invalid or expired");
    }

    return user;
  },

  async fetchProblems(session: SessionData) {
    const payload = await requestLeetCode<ProblemsListResponse>(
      session.domain,
      session.cookie,
      session.csrfToken,
      "/api/problems/algorithms/",
      { method: "GET" }
    );

    if (!payload.stat_status_pairs) {
      throw new HttpError(502, "Invalid problems response from LeetCode");
    }

    return normalizeProblemList(payload.stat_status_pairs, session.domain);
  },

  async fetchQuestionDetail(session: SessionData, titleSlug: string) {
    const data = await queryGraphQL<{ question: Record<string, unknown> | null }>(
      session.domain,
      session.cookie,
      session.csrfToken,
      queries.questionDetail,
      { titleSlug }
    );

    if (!data.question) {
      throw new HttpError(404, "Question not found");
    }

    return normalizeQuestionPayload(data.question);
  },

  async runCode(
    session: SessionData,
    titleSlug: string,
    payload: {
      lang: string;
      questionId: string;
      typedCode: string;
      dataInput?: string;
    },
    submit: boolean
  ) {
    const endpoint = submit
      ? `/problems/${titleSlug}/submit/`
      : `/problems/${titleSlug}/interpret_solution/`;

    return requestLeetCode<Record<string, unknown>>(
      session.domain,
      session.cookie,
      session.csrfToken,
      endpoint,
      {
        method: "POST",
        body: {
          lang: payload.lang,
          question_id: payload.questionId,
          typed_code: payload.typedCode,
          data_input: payload.dataInput || ""
        }
      }
    );
  },

  async checkSubmission(session: SessionData, submissionId: string) {
    return requestLeetCode<Record<string, unknown>>(
      session.domain,
      session.cookie,
      session.csrfToken,
      `/submissions/detail/${submissionId}/check/`,
      { method: "GET" }
    );
  },

  async fetchLatestSubmission(session: SessionData, questionId: string, lang: string) {
    const query = new URLSearchParams({ qid: questionId, lang }).toString();
    return requestLeetCode<Record<string, unknown>>(
      session.domain,
      session.cookie,
      session.csrfToken,
      `/submissions/latest/?${query}`,
      { method: "GET" }
    );
  },

  async fetchDaily(session: SessionData) {
    const data = await queryGraphQL<Record<string, unknown>>(
      session.domain,
      session.cookie,
      session.csrfToken,
      queries.questionOfToday(session.domain),
      {}
    );

    const titleSlug = extractDailyTitleSlug(data);
    if (!titleSlug) {
      throw new HttpError(502, "Unable to parse daily challenge from LeetCode response");
    }

    return { titleSlug };
  }
};
