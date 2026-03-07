const { contextBridge } = require('electron');

// Expose a minimal, safe API to the renderer process
contextBridge.exposeInMainWorld('alter', {
    platform: process.platform,
    isElectron: true,
});
