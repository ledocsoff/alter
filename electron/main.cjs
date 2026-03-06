const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');

// ─── Native Auto-Update (electron-updater) ─────────────────
function setupAutoUpdate() {
    try {
        // Reroute autoUpdater logs to the React frontend for transparent debugging
        autoUpdater.logger = {
            info(msg) { console.log(msg); const ws = BrowserWindow.getAllWindows(); if (ws.length > 0) ws[0].webContents.send('backend-log', { level: 'info', source: 'updater', msg }); },
            warn(msg) { console.warn(msg); const ws = BrowserWindow.getAllWindows(); if (ws.length > 0) ws[0].webContents.send('backend-log', { level: 'warn', source: 'updater', msg }); },
            error(msg) { console.error(msg); const ws = BrowserWindow.getAllWindows(); if (ws.length > 0) ws[0].webContents.send('backend-log', { level: 'error', source: 'updater', msg }); }
        };

        // Mac Security: Prevent updates if app is running in App Translocation (Quarantine)
        if (process.platform === 'darwin' && !app.isInApplicationsFolder()) {
            console.warn('[Update] Mac App is NOT in Applications folder. Translocation active. Updates disabled.');
            setTimeout(() => {
                const wins = BrowserWindow.getAllWindows();
                if (wins.length > 0) wins[0].webContents.send('not-in-applications');
            }, 5000);
            return; // Abort auto-update setup to prevent silent failures
        }

        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.requestHeaders = { "Cache-Control": "no-cache" };

        autoUpdater.on('update-available', (info) => {
            console.log(`[Update] Nouvelle version disponible: v${info.version}`);
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) wins[0].webContents.send('update-available', info);
        });

        let lastProgressTime = 0;
        autoUpdater.on('download-progress', (progressObj) => {
            const now = Date.now();
            // Eviter le spam UI (React re-render) en limitant à ~5 envois/sec
            if (now - lastProgressTime > 200 || progressObj.percent === 100) {
                lastProgressTime = now;
                const wins = BrowserWindow.getAllWindows();
                if (wins.length > 0) wins[0].webContents.send('update-download-progress', progressObj);
            }
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log(`[Update] v${info.version} téléchargée, prête à installer`);
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) wins[0].webContents.send('update-downloaded', info.version);
        });

        autoUpdater.on('error', (err) => {
            console.warn('[Update] Erreur auto-update (non bloquante):', err.message);
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) wins[0].webContents.send('update-error', err.message);
        });

        // L'auto-updater est maintenant 100% MANUEL.
        // On supprime checkForUpdatesAndNotify() pour éviter les fenêtres natives système buggées au démarrage.
    } catch (err) {
        console.log('[Update] electron-updater non disponible, auto-update désactivé.');
    }
}

// IPC handler for manual check
ipcMain.handle('check-for-updates', async (event) => {
    try {
        const result = await autoUpdater.checkForUpdates();
        const remoteVersion = result?.updateInfo?.version || '0.0.0';
        const currentVersion = app.getVersion();

        // Ensure accurate comparison
        const isUpdateAvailable = remoteVersion !== '0.0.0' && remoteVersion !== currentVersion;
        return {
            success: true,
            isUpdateAvailable,
            remoteVersion,
            currentVersion
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Notify renderer when NO update is available (useful for manual checks)
autoUpdater.on('update-not-available', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send('update-not-available');
    }
});

// React can call this to trigger the install and restart
ipcMain.on('restart-app', () => {
    autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
});


// ─── Configuration ──────────────────────────────────────
const IS_DEV = process.env.ELECTRON_DEV === 'true';
const VITE_PORT = 5173;
const SERVER_PORT = 3001;

let mainWindow = null;
let serverProcess = null;

// ─── Start the Express API server ───────────────────────
function startServer() {
    return new Promise((resolve, reject) => {
        if (IS_DEV) {
            console.log('[Electron] Dev mode: using external API server from concurrently');
            // Do not spawn the server, just proceed to polling
        } else {
            const serverPath = path.join(process.resourcesPath, 'server.cjs');
            const { spawn } = require('child_process');
            serverProcess = spawn(process.execPath, [serverPath], {
                env: {
                    ...process.env,
                    ELECTRON_RUN_AS_NODE: '1',
                    ELECTRON: 'true',
                    VELVET_SAVE_PATH: path.join(app.getPath('documents'), 'Velvet Studio')
                },
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            const fs = require('fs');
            const logPath = path.join(app.getPath('userData'), 'server-crash.log');
            fs.writeFileSync(logPath, '[Electron] Starting internal server...\n', { flag: 'a' });

            serverProcess.stdout?.on('data', (data) => {
                const msg = data.toString().trim();
                console.log('[Server]', msg);
                fs.writeFileSync(logPath, `[OUT] ${msg}\n`, { flag: 'a' });
            });

            serverProcess.stderr?.on('data', (data) => {
                const msg = data.toString().trim();
                console.error('[Server Error]', msg);
                fs.writeFileSync(logPath, `[ERR] ${msg}\n`, { flag: 'a' });
            });

            serverProcess.on('error', (err) => {
                fs.writeFileSync(logPath, `[SPAWN ERR] ${err.message}\n`, { flag: 'a' });
                reject(err);
            });

            serverProcess.on('exit', (code, signal) => {
                fs.writeFileSync(logPath, `[EXIT] code=${code} signal=${signal}\n`, { flag: 'a' });
                if (signal === 'SIGTERM' || signal === 'SIGINT') return; // Intentional kill
                console.warn(`[Electron] ⚠ Server crashed (code ${code}). Restarting in 2s...`);
                setTimeout(() => {
                    console.log('[Electron] 🔄 Relaunching local API server...');
                    startServer().catch(console.error);
                }, 2000);
            });
        }

        // Poll health endpoint until server is ready (up to 10s)
        let attempts = 0;
        const maxAttempts = 20;
        const poll = setInterval(async () => {
            attempts++;
            try {
                const http = require('http');
                const req = http.get(`http://localhost:${SERVER_PORT}/api/health`, (res) => {
                    if (res.statusCode === 200) {
                        clearInterval(poll);
                        console.log('[Electron] Server ready after', attempts * 500, 'ms');
                        resolve();
                    }
                });
                req.on('error', () => { }); // Server not ready yet
                req.setTimeout(400, () => req.destroy());
            } catch { /* ignore */ }
            if (attempts >= maxAttempts) {
                clearInterval(poll);
                console.warn('[Electron] Server did not respond in 10s, continuing anyway');
                resolve();
            }
        }, 500);
    });
}

// ─── Create the main browser window ─────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'Velvet Studio',
        titleBarStyle: 'hiddenInset',     // Sleek macOS look
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#09090b',       // Match app background
        show: false,                      // Show when ready
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });

    // Load the app
    if (IS_DEV) {
        mainWindow.loadURL(`http://localhost:${VITE_PORT}`);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        // In production, the dist folder is moved out of app.asar into Resources/dist 
        // because we listed it inside extraResources in electron-builder.
        mainWindow.loadFile(path.join(process.resourcesPath, 'dist', 'index.html'));
    }

    // Show window once content is ready (avoids white flash)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open external links in the default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Block navigation to untrusted origins (XSS defense)
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const allowed = ['http://localhost:', 'file://'];
        if (!allowed.some(prefix => url.startsWith(prefix))) {
            event.preventDefault();
            console.warn(`[Security] Blocked navigation to: ${url}`);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ─── App lifecycle ──────────────────────────────────────
app.whenReady().then(async () => {
    console.log('💎 Starting Velvet Studio...');
    console.log(`   Mode: ${IS_DEV ? 'Development' : 'Production'}`);

    await startServer();
    createWindow();

    // Auto-update in production only
    if (!IS_DEV) setupAutoUpdate(mainWindow);

    app.on('activate', () => {
        // macOS: re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On macOS, keep the app running until Cmd+Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Kill the server process cleanly
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
    }
});
