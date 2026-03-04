#!/usr/bin/env node
// ============================================
// AUTO-RESTART — relance le serveur s'il crash
// ============================================
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, 'server.js');
const MAX_RESTARTS = 10;
const RESTART_DELAY_MS = 2000;
const RESET_WINDOW_MS = 60000; // Reset crash counter after 1min stable

let restartCount = 0;
let lastCrashTime = 0;

function startServer() {
    const child = fork(SERVER_PATH, [], { stdio: 'inherit' });

    child.on('exit', (code, signal) => {
        if (signal === 'SIGTERM' || signal === 'SIGINT') {
            console.log('\n[Runner] Arret demande, bye.');
            process.exit(0);
        }

        const now = Date.now();
        // Reset counter if server was stable for >1 min
        if (now - lastCrashTime > RESET_WINDOW_MS) restartCount = 0;
        lastCrashTime = now;
        restartCount++;

        if (restartCount >= MAX_RESTARTS) {
            console.error(`[Runner] ❌ ${MAX_RESTARTS} crashes consecutifs — arret definitif.`);
            console.error('[Runner] Verifiez les logs ci-dessus et corrigez le probleme.');
            process.exit(1);
        }

        console.warn(`[Runner] ⚠ Serveur arrete (code ${code}) — redemarrage ${restartCount}/${MAX_RESTARTS} dans ${RESTART_DELAY_MS / 1000}s...`);
        setTimeout(startServer, RESTART_DELAY_MS);
    });

    // Forward signals
    process.on('SIGTERM', () => child.kill('SIGTERM'));
    process.on('SIGINT', () => child.kill('SIGINT'));
}

console.log('[Runner] 🔄 Lancement du serveur avec auto-restart...');
startServer();
