import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";

const languageToExtension: Record<string, string> = {
  cpp: "cpp",
  c: "c",
  csharp: "cs",
  golang: "go",
  java: "java",
  javascript: "js",
  kotlin: "kt",
  mysql: "sql",
  mssql: "sql",
  oraclesql: "sql",
  pandas: "py",
  php: "php",
  postgresql: "sql",
  python: "py",
  python3: "py",
  ruby: "rb",
  rust: "rs",
  scala: "scala",
  swift: "swift",
  typescript: "ts"
};

function sanitizeSegment(value: string, fieldName: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw new HttpError(400, `${fieldName} is required`);
  }

  const safe = normalized.replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  if (!safe) {
    throw new HttpError(400, `${fieldName} is invalid`);
  }

  return safe;
}

function extensionForLanguage(language: string): string {
  return languageToExtension[language] || "txt";
}

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function buildFilePath(titleSlug: string, lang: string): string {
  const safeSlug = sanitizeSegment(titleSlug, "titleSlug");
  const safeLang = sanitizeSegment(lang, "lang");
  const ext = extensionForLanguage(safeLang);
  return path.join(config.solutionsDir, safeLang, `${safeSlug}.${ext}`);
}

export const codeStorageService = {
  async saveCode(titleSlug: string, lang: string, code: string) {
    if (typeof code !== "string") {
      throw new HttpError(400, "code must be a string");
    }

    const filePath = buildFilePath(titleSlug, lang);
    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, code, "utf8");

    return {
      titleSlug: sanitizeSegment(titleSlug, "titleSlug"),
      lang: sanitizeSegment(lang, "lang"),
      filePath,
      bytes: Buffer.byteLength(code, "utf8")
    };
  },

  async getCode(titleSlug: string, lang: string) {
    const filePath = buildFilePath(titleSlug, lang);

    try {
      const code = await fs.readFile(filePath, "utf8");
      const stats = await fs.stat(filePath);

      return {
        titleSlug: sanitizeSegment(titleSlug, "titleSlug"),
        lang: sanitizeSegment(lang, "lang"),
        filePath,
        updatedAt: stats.mtime.toISOString(),
        bytes: stats.size,
        code
      };
    } catch (error) {
      const isMissing =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT";

      if (isMissing) {
        return null;
      }

      throw error;
    }
  },

  async listSavedCode() {
    await ensureDirectory(config.solutionsDir);
    const langs = await fs.readdir(config.solutionsDir, { withFileTypes: true });

    const items: Array<{
      titleSlug: string;
      lang: string;
      filePath: string;
      updatedAt: string;
      bytes: number;
    }> = [];

    for (const langDir of langs) {
      if (!langDir.isDirectory()) {
        continue;
      }

      const lang = langDir.name;
      const dirPath = path.join(config.solutionsDir, lang);
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        if (!file.isFile()) {
          continue;
        }

        const filePath = path.join(dirPath, file.name);
        const stats = await fs.stat(filePath);
        const titleSlug = file.name.replace(/\.[^.]+$/, "");

        items.push({
          titleSlug,
          lang,
          filePath,
          updatedAt: stats.mtime.toISOString(),
          bytes: stats.size
        });
      }
    }

    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return items;
  }
};
