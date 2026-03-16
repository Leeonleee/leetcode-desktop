export type Domain = "com" | "cn";
export type Theme = "light" | "dark";
export type DifficultyFilter = "All" | "Easy" | "Medium" | "Hard";
export type AuthBootstrapState = "checking" | "ready";

export type User = {
  username?: string;
  slug?: string;
};

export type Problem = {
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

export type CodeSnippet = {
  lang: string;
  langSlug: string;
  code: string;
};

export type QuestionDetail = {
  questionId: string;
  questionFrontendId?: string;
  title: string;
  titleSlug: string;
  isPaidOnly?: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
  likes?: number;
  dislikes?: number;
  categoryTitle?: string;
  content?: string;
  mysqlSchemas?: string;
  dataSchemas?: string;
  codeSnippets?: CodeSnippet[];
  exampleTestcaseList?: string[];
  metaData?: unknown;
  acRate?: number;
  stats?: unknown;
  hints?: string[];
  topicTags?: Array<{ name: string; slug: string }>;
  similarQuestionList?: Array<{
    difficulty: string;
    titleSlug: string;
    title: string;
    isPaidOnly: boolean;
  }>;
};

export type LoginApiResponse = {
  sessionToken?: string;
  user?: User;
  message?: string;
};

export type QuestionApiResponse = {
  ok?: boolean;
  question?: QuestionDetail;
  message?: string;
};

export type ProblemsApiResponse = {
  ok?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  items?: Problem[];
  message?: string;
};

export type DailyApiResponse = {
  daily?: {
    titleSlug?: string;
  };
  message?: string;
};
