import { createApp } from "./app.js";
import { config } from "./config.js";
import { sessionStore } from "./services/session-store.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});

const cleanupTimer = setInterval(() => {
  sessionStore.cleanupExpired();
}, 5 * 60_000);

function shutdown(signal: string) {
  clearInterval(cleanupTimer);
  server.close(() => {
    console.log(`Server shut down after ${signal}`);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
