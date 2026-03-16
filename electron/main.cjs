const path = require("node:path");
const fs = require("node:fs/promises");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

const isDev = !app.isPackaged;
const rendererUrl = process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";
const authCachePath = () => path.join(app.getPath("userData"), "auth-cache.json");

async function readAuthCacheFile() {
  try {
    const raw = await fs.readFile(authCachePath(), "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const cookie = typeof parsed.cookie === "string" ? parsed.cookie.trim() : "";
    const domain = parsed.domain === "cn" ? "cn" : parsed.domain === "com" ? "com" : null;

    if (!cookie || !domain) {
      return null;
    }

    return { cookie, domain };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeAuthCacheFile(payload) {
  const cookie = typeof payload?.cookie === "string" ? payload.cookie.trim() : "";
  const domain = payload?.domain === "cn" ? "cn" : payload?.domain === "com" ? "com" : null;

  if (!cookie || !domain) {
    throw new Error("Invalid auth cache payload");
  }

  await fs.mkdir(path.dirname(authCachePath()), { recursive: true });
  await fs.writeFile(authCachePath(), JSON.stringify({ cookie, domain }, null, 2), "utf8");
  return { ok: true };
}

async function clearAuthCacheFile() {
  try {
    await fs.unlink(authCachePath());
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  return { ok: true };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: "#f4f7fb",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  if (isDev) {
    win.loadURL(rendererUrl);
  } else {
    win.loadFile(path.join(__dirname, "..", "client", "dist", "index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

ipcMain.handle("auth-cache:read", async () => readAuthCacheFile());
ipcMain.handle("auth-cache:write", async (_event, payload) => writeAuthCacheFile(payload));
ipcMain.handle("auth-cache:clear", async () => clearAuthCacheFile());

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
