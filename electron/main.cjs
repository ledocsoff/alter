const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');

// ─── Auto-Update ────────────────────────────────────────
let autoUpdater = null;
function setupAutoUpdate() {
    try {
        autoUpdater = require('electron-updater').autoUpdater;
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('update-available', (info) => {
            console.log(`[Update] Nouvelle version disponible: v${info.version}`);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log(`[Update] v${info.version} telechargee, prete a installer`);
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Mise a jour disponible',
                message: `Velvet Studio v${info.version} est prete.`,
                detail: 'Redemarrer maintenant pour appliquer la mise a jour ?',
                buttons: ['Redemarrer', 'Plus tard'],
                defaultId: 0,
            }).then(({ response }) => {
                if (response === 0) autoUpdater.quitAndInstall();
            });
        });

        autoUpdater.on('error', (err) => {
            console.warn('[Update] Erreur auto-update (non bloquante):', err.message);
        });

        // Check for updates 3s after launch
        setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
    } catch (err) {
        console.log('[Update] electron-updater non disponible, auto-update desactive.');
    }
}

// ─── Configuration ──────────────────────────────────────
const IS_DEV = process.env.ELECTRON_DEV === 'true';
const VITE_PORT = 5173;
const SERVER_PORT = 3001;

let mainWindow = null;
let serverProcess = null;

// ─── Start the Express API server ───────────────────────
function startServer() {
    return new Promise((resolve, reject) => {
        // In production, server.js is next to the asar/app directory
        const serverPath = IS_DEV
            ? path.join(__dirname, '..', 'server.js')
            : path.join(process.resourcesPath, 'server.js');

        serverProcess = fork(serverPath, [], {
            env: { ...process.env, ELECTRON: 'true' },
            stdio: 'pipe',
        });

        serverProcess.stdout?.on('data', (data) => {
            const msg = data.toString();
            console.log('[Server]', msg.trim());
            if (msg.includes('Velvet Studio Server')) {
                resolve();
            }
        });

        serverProcess.stderr?.on('data', (data) => {
            console.error('[Server Error]', data.toString().trim());
        });

        serverProcess.on('error', reject);

        // Fallback: resolve after 3s even if no message received
        setTimeout(resolve, 3000);
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
    if (!IS_DEV) setupAutoUpdate();

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
