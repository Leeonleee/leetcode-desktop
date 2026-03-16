const path = require("node:path");
const { app, BrowserWindow, shell } = require("electron");

const isDev = !app.isPackaged;
const rendererUrl = process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";

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
      sandbox: true
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
