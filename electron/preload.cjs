const { contextBridge } = require('electron');

// Expose a minimal, safe API to the renderer process
contextBridge.exposeInMainWorld('velvet', {
    platform: process.platform,
    isElectron: true,
});
