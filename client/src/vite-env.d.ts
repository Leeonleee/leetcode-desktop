/// <reference types="vite/client" />

type CachedAuthPayload = {
  cookie: string;
  domain: "com" | "cn";
};

interface Window {
  authCache?: {
    read: () => Promise<CachedAuthPayload | null>;
    write: (payload: CachedAuthPayload) => Promise<{ ok: true }>;
    clear: () => Promise<{ ok: true }>;
  };
}
