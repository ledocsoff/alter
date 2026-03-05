const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');

// ─── Native Auto-Update (electron-updater) ─────────────────
function setupAutoUpdate(window) {
    try {
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('update-available', (info) => {
            console.log(`[Update] Nouvelle version disponible: v${info.version}`);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log(`[Update] v${info.version} téléchargée, prête à installer`);
            // Prevenir l'UI React qu'une mise a jour est prete
            if (window && !window.isDestroyed()) {
                window.webContents.send('update-downloaded', info.version);
            }
        });

        autoUpdater.on('error', (err) => {
            console.warn('[Update] Erreur auto-update (non bloquante):', err.message);
        });

        // Check for updates 3s after launch
        setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
    } catch (err) {
        console.log('[Update] electron-updater non disponible, auto-update désactivé.');
    }
}

// IPC handler for manual check
ipcMain.handle('check-for-updates', async (event) => {
    try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, isUpdateAvailable: result?.updateInfo != null };
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
    autoUpdater.quitAndInstall();
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
            const serverPath = path.join(process.resourcesPath, 'server.js');
            serverProcess = fork(serverPath, [], {
                env: { ...process.env, ELECTRON: 'true' },
                stdio: 'pipe',
            });

            serverProcess.stdout?.on('data', (data) => {
                console.log('[Server]', data.toString().trim());
            });

            serverProcess.stderr?.on('data', (data) => {
                console.error('[Server Error]', data.toString().trim());
            });

            serverProcess.on('error', reject);

            serverProcess.on('exit', (code, signal) => {
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
        // In production, serve the built Vite app
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
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
