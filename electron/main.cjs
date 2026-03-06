const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');


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
            // Under production, server.cjs is bundled directly inside the sealed app.asar.
            // Node's `fork()` method (unlike `spawn()`) is designed to execute scripts securely from inside ASAR archives!
            const serverPath = path.join(__dirname, '../dist/server.cjs');
            const { fork } = require('child_process');
            serverProcess = fork(serverPath, [], {
                env: {
                    ...process.env,
                    ELECTRON_RUN_AS_NODE: '1',
                    ELECTRON: 'true',
                    ALTER_SAVE_PATH: path.join(app.getPath('documents'), 'Alter')
                },
                stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
            });

            const fs = require('fs');
            const logPath = path.join(app.getPath('userData'), 'server-crash.log');
            fs.writeFileSync(logPath, '[Electron] Starting internal server via fork()...\n', { flag: 'a' });

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
                fs.writeFileSync(logPath, `[FORK ERR] ${err.message}\n`, { flag: 'a' });
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
        title: 'Alter',
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

    if (IS_DEV) {
        mainWindow.loadURL(`http://localhost:${VITE_PORT}`);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        // In production, index.html is loaded directly from inside the secure app.asar
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
    console.log('💎 Starting Alter...');
    console.log(`   Mode: ${IS_DEV ? 'Development' : 'Production'}`);

    await startServer();
    createWindow();

    createWindow();

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
