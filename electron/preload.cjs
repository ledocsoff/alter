const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe API to the renderer process
contextBridge.exposeInMainWorld('velvet', {
    platform: process.platform,
    isElectron: true,
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    onUpdateAvailable: (callback) => {
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.on('update-available', (event, info) => callback(info));
    },
    onUpdateDownloadProgress: (callback) => {
        ipcRenderer.removeAllListeners('update-download-progress');
        ipcRenderer.on('update-download-progress', (event, progressObj) => callback(progressObj));
    },
    onUpdateNotAvailable: (callback) => {
        ipcRenderer.removeAllListeners('update-not-available');
        ipcRenderer.on('update-not-available', callback);
    },
    onUpdateError: (callback) => {
        ipcRenderer.removeAllListeners('update-error');
        ipcRenderer.on('update-error', (event, error) => callback(error));
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.on('update-downloaded', (event, version) => callback(version));
    },
    onNotInApplications: (callback) => {
        ipcRenderer.removeAllListeners('not-in-applications');
        ipcRenderer.on('not-in-applications', callback);
    },
    onBackendLog: (callback) => {
        ipcRenderer.removeAllListeners('backend-log');
        ipcRenderer.on('backend-log', (event, log) => callback(log));
    },
    restartApp: () => ipcRenderer.send('restart-app'),
});
