const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("authCache", {
  read: () => ipcRenderer.invoke("auth-cache:read"),
  write: (payload) => ipcRenderer.invoke("auth-cache:write", payload),
  clear: () => ipcRenderer.invoke("auth-cache:clear")
});
