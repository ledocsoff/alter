const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe API to the renderer process
contextBridge.exposeInMainWorld('velvet', {
    platform: process.platform,
    isElectron: true,
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, version) => callback(version)),
    restartApp: () => ipcRenderer.send('restart-app'),
});
