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

export type LoginApiResponse = {
  sessionToken?: string;
  user?: User;
  message?: string;
};

export type ProblemsApiResponse = {
  items?: Problem[];
  message?: string;
};

export type DailyApiResponse = {
  daily?: {
    titleSlug?: string;
  };
  message?: string;
};
