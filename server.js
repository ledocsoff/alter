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
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'file://'];

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
    // Allow requests with no origin (Electron file://, same-origin, etc.)
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
app.use(express.json({ limit: '50mb' }));

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

// ============================================
// GALLERY — Images stored on filesystem
// ============================================
const GALLERY_DIR = path.join(SAVE_DIR, 'gallery');
const GALLERY_INDEX = path.join(GALLERY_DIR, 'index.json');
const MAX_GALLERY = 100;

if (!fs.existsSync(GALLERY_DIR)) {
    fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

const readGalleryIndex = () => {
    try {
        if (fs.existsSync(GALLERY_INDEX)) {
            return JSON.parse(fs.readFileSync(GALLERY_INDEX, 'utf-8'));
        }
    } catch (err) {
        console.error('[Server] Erreur lecture gallery index:', err.message);
    }
    return [];
};

const writeGalleryIndex = (entries) => {
    const tmpFile = path.join(GALLERY_DIR, `.index.tmp.${crypto.randomBytes(4).toString('hex')}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf-8');
    fs.renameSync(tmpFile, GALLERY_INDEX);
};

// List gallery (returns metadata + base64 data)
app.get('/api/gallery', (_req, res) => {
    const entries = readGalleryIndex();
    const result = entries.map(entry => {
        try {
            const imgPath = path.join(GALLERY_DIR, entry.filename);
            if (fs.existsSync(imgPath)) {
                const base64 = fs.readFileSync(imgPath, 'base64');
                return { ...entry, base64 };
            }
            return { ...entry, base64: null };
        } catch {
            return { ...entry, base64: null };
        }
    });
    res.json(result);
});

// Save a new gallery image
app.post('/api/gallery', (req, res) => {
    try {
        const { base64, mimeType, prompt, scene, modelName, locationName, accountHandle, seed } = req.body;
        if (!base64) return res.status(400).json({ error: 'base64 requis' });

        const ext = (mimeType || 'image/png').includes('jpeg') ? 'jpg' : 'png';
        const id = `gal_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const filename = `${id}.${ext}`;

        // Write image data to file
        const imgBuffer = Buffer.from(base64, 'base64');
        fs.writeFileSync(path.join(GALLERY_DIR, filename), imgBuffer);

        // Update index
        const entries = readGalleryIndex();
        const entry = {
            id,
            filename,
            mimeType: mimeType || 'image/png',
            prompt: prompt || '',
            scene: scene || {},
            modelName: modelName || '',
            locationName: locationName || 'Sandbox',
            accountHandle: accountHandle || '',
            seed: seed || null,
            timestamp: Date.now(),
            starred: false,
        };
        entries.unshift(entry);

        // Enforce max gallery size
        while (entries.length > MAX_GALLERY) {
            const removed = entries.pop();
            const removedPath = path.join(GALLERY_DIR, removed.filename);
            try { fs.unlinkSync(removedPath); } catch { /* ignore */ }
        }

        writeGalleryIndex(entries);
        console.log(`[Server] Gallery +1 — ${entries.length} images, ${filename}`);
        res.json({ ok: true, id, total: entries.length });
    } catch (err) {
        console.error('[Server] Erreur gallery save:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Toggle star on a gallery image
app.patch('/api/gallery/:id/star', (req, res) => {
    const entries = readGalleryIndex();
    const entry = entries.find(e => e.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Image introuvable' });
    entry.starred = !entry.starred;
    writeGalleryIndex(entries);
    res.json({ ok: true, starred: entry.starred });
});

// Delete a single gallery image
app.delete('/api/gallery/:id', (req, res) => {
    const entries = readGalleryIndex();
    const idx = entries.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Image introuvable' });
    const [removed] = entries.splice(idx, 1);
    const removedPath = path.join(GALLERY_DIR, removed.filename);
    try { fs.unlinkSync(removedPath); } catch { /* ignore */ }
    writeGalleryIndex(entries);
    console.log(`[Server] Gallery -1 — ${entries.length} images restantes`);
    res.json({ ok: true, remaining: entries.length });
});

// Clear entire gallery
app.delete('/api/gallery', (_req, res) => {
    try {
        const entries = readGalleryIndex();
        for (const entry of entries) {
            try { fs.unlinkSync(path.join(GALLERY_DIR, entry.filename)); } catch { /* ignore */ }
        }
        writeGalleryIndex([]);
        console.log('[Server] Gallery videe');
        res.json({ ok: true });
    } catch (err) {
        console.error('[Server] Erreur clear gallery:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n  💎 Velvet Studio Server`);
    console.log(`  ➜  API:         http://localhost:${PORT}/api`);
    console.log(`  ➜  CORS:        ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`  ➜  Sauvegarde:  ${SAVE_DIR}/`);
    console.log(`  ➜  Galerie:     ${GALLERY_DIR}/ (max ${MAX_GALLERY} images)`);
    console.log(`  ➜  Backups:     ${MAX_BACKUPS} rotations automatiques`);
    console.log(`  ➜  Sécurité:    écriture atomique + validation + rate limit\n`);
});
