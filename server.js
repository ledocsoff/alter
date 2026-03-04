import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVE_DIR = path.join(__dirname, 'sauvegarde');
const DATA_FILE = path.join(SAVE_DIR, 'data.json');
const MAX_BACKUPS = 3;
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

// Ensure save directory exists
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
}

const EMPTY_DATA = { models: [], templates: [], history: [] };

const backupPath = (n) => path.join(SAVE_DIR, `data.backup.${n}.json`);

// ============================================
// CORS — restreint à localhost:5173
// ============================================
const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
    } else {
        return res.status(403).json({ error: 'Origine non autorisée' });
    }
    next();
};

// ============================================
// VALIDATION — vérifie la structure du payload
// ============================================
const validatePayload = (data) => {
    if (!data || typeof data !== 'object') return 'Payload invalide: objet attendu';
    if (!Array.isArray(data.models)) return 'Payload invalide: models doit être un tableau';
    // templates et history optionnels mais doivent être des tableaux si présents
    if (data.templates !== undefined && !Array.isArray(data.templates)) return 'Payload invalide: templates doit être un tableau';
    if (data.history !== undefined && !Array.isArray(data.history)) return 'Payload invalide: history doit être un tableau';
    return null;
};

// ============================================
// ATOMIC WRITE — écriture dans .tmp puis rename
// ============================================
const writeDataAtomic = (data) => {
    const json = JSON.stringify(data, null, 2);
    const tmpFile = path.join(SAVE_DIR, `.data.tmp.${crypto.randomBytes(4).toString('hex')}.json`);
    fs.writeFileSync(tmpFile, json, 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
};

// ============================================
// BACKUP ROTATION
// ============================================
const rotateBackups = () => {
    try {
        for (let i = MAX_BACKUPS; i > 1; i--) {
            const src = backupPath(i - 1);
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, backupPath(i));
            }
        }
        if (fs.existsSync(DATA_FILE)) {
            fs.copyFileSync(DATA_FILE, backupPath(1));
        }
    } catch (err) {
        console.error('[Server] Erreur rotation backup:', err.message);
    }
};

const readData = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        }
    } catch (err) {
        console.error('[Server] Erreur lecture:', err.message);
    }
    return { ...EMPTY_DATA };
};

// ============================================
// RATE LIMITER — 1 save/seconde max
// ============================================
let lastSaveTime = 0;

const app = express();
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Load all data
app.get('/api/load', (_req, res) => {
    res.json(readData());
});

// Save all data (with validation, atomic write, backup rotation)
app.post('/api/save', (req, res) => {
    // Rate limit
    const now = Date.now();
    if (now - lastSaveTime < 1000) {
        return res.status(429).json({ error: 'Trop de requêtes, réessayez dans 1s' });
    }
    lastSaveTime = now;

    // Validate
    const err = validatePayload(req.body);
    if (err) {
        console.error(`[Server] Rejeté — ${err}`);
        return res.status(400).json({ error: err });
    }

    try {
        rotateBackups();
        writeDataAtomic(req.body);
        const n = req.body.models?.length || 0;
        console.log(`[Server] Sauvegarde OK — ${n} modele(s) → ${DATA_FILE}`);
        res.json({ ok: true });
    } catch (err) {
        console.error('[Server] Erreur ecriture:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// List available backups
app.get('/api/backups', (_req, res) => {
    const backups = [];
    for (let i = 1; i <= MAX_BACKUPS; i++) {
        const bp = backupPath(i);
        if (fs.existsSync(bp)) {
            const stat = fs.statSync(bp);
            backups.push({ id: i, file: `data.backup.${i}.json`, size: stat.size, date: stat.mtime });
        }
    }
    res.json(backups);
});

// Restore from a specific backup
app.post('/api/restore/:n', (req, res) => {
    const n = parseInt(req.params.n);
    if (n < 1 || n > MAX_BACKUPS) return res.status(400).json({ error: 'Backup invalide' });
    const bp = backupPath(n);
    if (!fs.existsSync(bp)) return res.status(404).json({ error: `Backup ${n} introuvable` });
    try {
        rotateBackups();
        fs.copyFileSync(bp, DATA_FILE);
        const data = readData();
        const count = data.models?.length || 0;
        console.log(`[Server] Restauration backup ${n} OK — ${count} modele(s)`);
        res.json({ ok: true, models: count });
    } catch (err) {
        console.error('[Server] Erreur restauration:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n  💎 Velvet Studio Server`);
    console.log(`  ➜  API:         http://localhost:${PORT}/api`);
    console.log(`  ➜  CORS:        ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`  ➜  Sauvegarde:  ${SAVE_DIR}/`);
    console.log(`  ➜  Backups:     ${MAX_BACKUPS} rotations automatiques`);
    console.log(`  ➜  Sécurité:    écriture atomique + validation + rate limit\n`);
});
