import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Support both ESM (local dev) and CJS (bundled for Electron production)
const currentDir = typeof __dirname !== 'undefined'
    ? __dirname
    : (typeof import.meta !== 'undefined' && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

const SAVE_DIR = path.join(currentDir, 'sauvegarde');
const DATA_FILE = path.join(SAVE_DIR, 'data.json');
const MAX_BACKUPS = 5;

// ============================================
// CORS — Dynamic origin validation (localhost + LAN + Tailscale)
// ============================================
const isAllowedOrigin = (origin) => {
    if (!origin) return true; // No origin = Electron file://, same-origin, curl
    // Localhost (dev)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    // Electron file://
    if (origin.startsWith('file://')) return true;
    // Private LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) return true;
    // Tailscale IPs (100.x.x.x CGNAT range)
    if (/^https?:\/\/100\./.test(origin)) return true;
    return false;
};

// Ensure save directory exists
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
}

const EMPTY_DATA = { dataVersion: 1, models: [], templates: [], history: [] };
const CURRENT_DATA_VERSION = 1;

// ============================================
// CHECKSUM — SHA-256 pour détecter la corruption
// ============================================
const computeChecksum = (data) => {
    const payload = JSON.stringify({ models: data.models || [], templates: data.templates || [], history: data.history || [] });
    return crypto.createHash('sha256').update(payload).digest('hex');
};

const verifyChecksum = (data) => {
    if (!data._checksum) return true; // pas de checksum → ancienne version, OK
    const expected = computeChecksum(data);
    return data._checksum === expected;
};

// ============================================
// DATA VERSIONING — migrations automatiques
// ============================================
const migrations = {
    // Version 0 → 1 : ajout du champ dataVersion + normalisation
    1: (data) => {
        data.dataVersion = 1;
        if (!Array.isArray(data.models)) data.models = [];
        if (!Array.isArray(data.templates)) data.templates = [];
        if (!Array.isArray(data.history)) data.history = [];
        // Normalise chaque modèle
        data.models.forEach(m => {
            if (!Array.isArray(m.accounts)) m.accounts = [];
            m.accounts.forEach(a => {
                if (!Array.isArray(a.locations)) a.locations = [];
            });
        });
        return data;
    },
    // Ajouter ici les futures migrations:
    // 2: (data) => { /* v1 → v2 */ return data; },
};

const migrateData = (data) => {
    let version = data.dataVersion || 0;
    while (version < CURRENT_DATA_VERSION) {
        version++;
        if (migrations[version]) {
            console.log(`[Server] Migration données v${version - 1} → v${version}`);
            data = migrations[version](data);
        }
    }
    data.dataVersion = CURRENT_DATA_VERSION;
    return data;
};

const backupPath = (n) => path.join(SAVE_DIR, `data.backup.${n}.json`);

// ============================================
// SECURITY — Input sanitization
// ============================================
const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9_\-.]/g, '_');

const isValidGalleryId = (id) => /^gal_\d+_[a-f0-9]+$/.test(id);

const MAX_IMAGE_SIZE_MB = 20;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
    } else {
        console.warn(`[Security] CORS bloqué: ${origin}`);
        return res.status(403).json({ error: 'Origine non autorisée' });
    }
    next();
};

// ============================================
// VALIDATION — vérifie + sanitise la structure du payload
// ============================================
const validatePayload = (data) => {
    if (!data || typeof data !== 'object') return 'Payload invalide: objet attendu';
    if (!Array.isArray(data.models)) return 'Payload invalide: models doit être un tableau';
    if (data.templates !== undefined && !Array.isArray(data.templates)) return 'Payload invalide: templates doit être un tableau';
    if (data.history !== undefined && !Array.isArray(data.history)) return 'Payload invalide: history doit être un tableau';

    // Validate and sanitize models
    for (let i = 0; i < data.models.length; i++) {
        const m = data.models[i];
        if (!m || typeof m !== 'object') return `Modèle #${i + 1}: objet invalide`;
        if (!m.id || typeof m.id !== 'string') return `Modèle #${i + 1}: id manquant`;
        if (!m.name || typeof m.name !== 'string') return `Modèle #${i + 1}: nom manquant`;
        // Auto-fix missing arrays
        if (!Array.isArray(m.accounts)) m.accounts = [];
        // Validate accounts
        for (let j = 0; j < m.accounts.length; j++) {
            const a = m.accounts[j];
            if (!a || typeof a !== 'object') { m.accounts.splice(j--, 1); continue; }
            if (!a.id) { m.accounts.splice(j--, 1); continue; }
            if (!Array.isArray(a.locations)) a.locations = [];
            // Validate locations
            for (let k = 0; k < a.locations.length; k++) {
                const l = a.locations[k];
                if (!l || typeof l !== 'object' || !l.id) { a.locations.splice(k--, 1); continue; }
            }
        }
    }

    return null;
};

// ============================================
// ATOMIC WRITE — écriture dans .tmp puis rename
// ============================================
const writeDataAtomic = (filepath, data) => {
    // Work on a copy to avoid mutating the original (e.g. req.body)
    const toWrite = { ...data };
    toWrite.dataVersion = CURRENT_DATA_VERSION;
    toWrite._checksum = computeChecksum(toWrite);
    const json = JSON.stringify(toWrite, null, 2);
    const dir = path.dirname(filepath);
    const tmpFile = path.join(dir, `.tmp.${crypto.randomBytes(4).toString('hex')}.json`);
    fs.writeFileSync(tmpFile, json, 'utf-8');
    fs.renameSync(tmpFile, filepath);
};

// ============================================
// BACKUP ROTATION (now 5 backups)
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
            const content = fs.readFileSync(DATA_FILE, 'utf-8');
            const parsed = JSON.parse(content);
            // Validate structure
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.models)) {
                // Verify checksum
                if (!verifyChecksum(parsed)) {
                    console.warn('[Server] ⚠ Checksum invalide sur data.json — corruption détectée');
                    console.warn('[Server] Tentative restauration depuis backup...');
                    return tryRestoreFromBackup();
                }
                // Run migrations if needed
                const migrated = migrateData(parsed);
                // Re-validate after migration
                const err = validatePayload(migrated);
                if (err) {
                    console.warn(`[Server] Données invalides après migration: ${err}`);
                    return tryRestoreFromBackup();
                }
                return migrated;
            }
            console.warn('[Server] data.json structure invalide, tentative restauration backup...');
            return tryRestoreFromBackup();
        }
    } catch (err) {
        console.error('[Server] Erreur lecture data.json:', err.message);
        console.warn('[Server] Tentative restauration automatique depuis backup...');
        return tryRestoreFromBackup();
    }
    return { ...EMPTY_DATA };
};

// ============================================
// AUTO-RECOVERY — essaie de restaurer depuis un backup
// ============================================
const tryRestoreFromBackup = () => {
    for (let i = 1; i <= MAX_BACKUPS; i++) {
        const bp = backupPath(i);
        try {
            if (fs.existsSync(bp)) {
                const content = fs.readFileSync(bp, 'utf-8');
                const parsed = JSON.parse(content);
                if (parsed && Array.isArray(parsed.models)) {
                    console.log(`[Server] ✓ Restauration auto depuis backup ${i} — ${parsed.models.length} modele(s)`);
                    // Rewrite main data file from backup
                    writeDataAtomic(DATA_FILE, parsed);
                    return parsed;
                }
            }
        } catch {
            console.warn(`[Server] Backup ${i} corrompu, essai suivant...`);
        }
    }
    console.error('[Server] ⚠ Aucun backup viable trouvé — démarrage avec données vides');
    return { ...EMPTY_DATA };
};

// ============================================
// RATE LIMITER — par endpoint
// ============================================
// (Ancien rate limiter manuel supprimé; remplacé par express-rate-limit ci-dessous)

// ============================================
// TEMP FILE CLEANUP — supprime les .tmp orphelins
// ============================================
const cleanupTempFiles = () => {
    try {
        const dirs = [SAVE_DIR, path.join(SAVE_DIR, 'gallery')];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;
            const files = fs.readdirSync(dir);
            for (const f of files) {
                if (f.startsWith('.tmp.') || f.startsWith('.data.tmp.') || f.startsWith('.index.tmp.')) {
                    try {
                        fs.unlinkSync(path.join(dir, f));
                        console.log(`[Server] Temp file nettoyé: ${f}`);
                    } catch { /* ignore */ }
                }
            }
        }
    } catch { /* ignore */ }
};

const app = express();

// ============================================
// SECURITY — Headers & Rate Limiting (Helmet + express-rate-limit)
// ============================================
app.use(helmet({
    // Disable CSP and crossOriginEmbedderPolicy to allow Vite's dev server inline scripts & external images
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// Apply a global rate limit to all API endpoints to prevent basic DDoS / bruteforce
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 minutes
    message: { error: 'Trop de requêtes, veuillez patienter avant de réessayer.' },
    standardHeaders: true,
});
app.use('/api', apiLimiter);

app.use(corsMiddleware);

// Middleware par défaut (limite 2MB pour textes/JSON classiques)
app.use(express.json({ limit: '2mb' }));

// Middleware spécifique pour les route acceptant du Base64 lourd
const largePayloadMiddleware = express.json({ limit: '50mb' });

// Health check — enrichi avec infos disque
app.get('/api/health', (_req, res) => {
    try {
        const dataSize = fs.existsSync(DATA_FILE) ? fs.statSync(DATA_FILE).size : 0;
        const galleryDir = path.join(SAVE_DIR, 'gallery');
        let galleryCount = 0;
        let gallerySize = 0;
        if (fs.existsSync(galleryDir)) {
            const files = fs.readdirSync(galleryDir).filter(f => !f.startsWith('.') && f !== 'index.json');
            galleryCount = files.length;
            gallerySize = files.reduce((sum, f) => {
                try { return sum + fs.statSync(path.join(galleryDir, f)).size; } catch { return sum; }
            }, 0);
        }
        res.json({
            ok: true,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            storage: {
                dataFile: `${(dataSize / 1024).toFixed(1)} KB`,
                gallery: { count: galleryCount, size: `${(gallerySize / 1024 / 1024).toFixed(1)} MB` },
                backups: Array.from({ length: MAX_BACKUPS }, (_, i) => {
                    const bp = backupPath(i + 1);
                    return fs.existsSync(bp) ? { id: i + 1, size: fs.statSync(bp).size, date: fs.statSync(bp).mtime } : null;
                }).filter(Boolean).length,
            },
        });
    } catch (err) {
        res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
    }
});

// Version info
let PKG_VERSION = 'unknown';
try {
    PKG_VERSION = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf-8')).version;
} catch (e) {
    console.warn('[Server] Could not read package.json version:', e.message);
}
app.get('/api/version', (_req, res) => {
    res.json({
        version: PKG_VERSION,
        dataVersion: CURRENT_DATA_VERSION,
        uptime: process.uptime(),
    });
});

// Load all data
app.get('/api/load', (_req, res) => {
    res.json(readData());
});

// ============================================
// GARBAGE COLLECTOR — Nettoie le disque des images orphelines
// ============================================
const garbageCollectOrphanedDirs = (modelsData) => {
    try {
        const validModelIds = new Set(modelsData?.map(m => m.id) || []);
        const validLocationIds = new Set(
            (modelsData || []).flatMap(m => m.accounts || [])
                .flatMap(a => a.locations || [])
                .map(l => l.id)
        );

        // Purge Model refs
        if (fs.existsSync(REFS_DIR)) {
            const modelDirs = fs.readdirSync(REFS_DIR);
            for (const mDir of modelDirs) {
                if (mDir.startsWith('mod_') && !validModelIds.has(mDir)) {
                    fs.rmSync(path.join(REFS_DIR, mDir), { recursive: true, force: true });
                    console.log(`[Server] GC: Dossier modele orphelin nettoye -> ${mDir}`);
                }
            }
        }

        // Purge Location refs
        if (fs.existsSync(LOC_REFS_DIR)) {
            const locDirs = fs.readdirSync(LOC_REFS_DIR);
            for (const lDir of locDirs) {
                if (lDir.startsWith('loc_') && !validLocationIds.has(lDir)) {
                    fs.rmSync(path.join(LOC_REFS_DIR, lDir), { recursive: true, force: true });
                    console.log(`[Server] GC: Dossier lieu orphelin nettoye -> ${lDir}`);
                }
            }
        }
    } catch (err) {
        console.error('[Server] Erreur Garbage Collection:', err.message);
    }
};

// Save all data (with validation, atomic write, backup rotation)
app.post('/api/save', (req, res) => {
    // Rate limit est géré globalement par apiLimiter désormais

    // Validate
    const err = validatePayload(req.body);
    if (err) {
        console.error(`[Server] Rejeté — ${err}`);
        return res.status(400).json({ error: err });
    }

    try {
        rotateBackups();
        writeDataAtomic(DATA_FILE, req.body);

        // Lance le nettoyeur de disque en arriere-plan
        if (req.body && req.body.models) {
            setTimeout(() => garbageCollectOrphanedDirs(req.body.models), 500);
        }

        const n = req.body.models?.length || 0;
        console.log(`[Server] Sauvegarde OK — ${n} modele(s)`);
        res.json({ ok: true });
    } catch (err) {
        console.error('[Server] Erreur ecriture:', err.message);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// List available backups
app.get('/api/backups', (_req, res) => {
    const backups = [];
    for (let i = 1; i <= MAX_BACKUPS; i++) {
        const bp = backupPath(i);
        if (fs.existsSync(bp)) {
            const stat = fs.statSync(bp);
            try {
                const data = JSON.parse(fs.readFileSync(bp, 'utf-8'));
                backups.push({
                    id: i,
                    file: `data.backup.${i}.json`,
                    size: stat.size,
                    date: stat.mtime,
                    models: data.models?.length || 0,
                    valid: true,
                });
            } catch {
                backups.push({ id: i, file: `data.backup.${i}.json`, size: stat.size, date: stat.mtime, valid: false });
            }
        }
    }
    res.json(backups);
});

// Restore from a specific backup
app.post('/api/restore/:n', (req, res) => {
    const n = parseInt(req.params.n);
    if (isNaN(n) || n < 1 || n > MAX_BACKUPS) return res.status(400).json({ error: 'Backup invalide' });
    const bp = backupPath(n);
    if (!fs.existsSync(bp)) return res.status(404).json({ error: `Backup ${n} introuvable` });

    try {
        // Validate backup integrity before restoring
        const backupContent = fs.readFileSync(bp, 'utf-8');
        const backupData = JSON.parse(backupContent);
        if (!backupData || !Array.isArray(backupData.models)) {
            return res.status(400).json({ error: `Backup ${n} corrompu: structure invalide` });
        }

        rotateBackups();
        fs.copyFileSync(bp, DATA_FILE);
        const count = backupData.models.length;
        console.log(`[Server] Restauration backup ${n} OK — ${count} modele(s)`);
        res.json({ ok: true, models: count });
    } catch (err) {
        console.error('[Server] Erreur restauration:', err.message);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// ============================================
// GALLERY — Optimized: metadata-only list + URL-based image serving
// ============================================
const GALLERY_DIR = path.join(SAVE_DIR, 'gallery');
const GALLERY_INDEX = path.join(GALLERY_DIR, 'index.json');
const MAX_GALLERY = 200;

if (!fs.existsSync(GALLERY_DIR)) {
    fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

const readGalleryIndex = () => {
    try {
        if (fs.existsSync(GALLERY_INDEX)) {
            const entries = JSON.parse(fs.readFileSync(GALLERY_INDEX, 'utf-8'));
            if (Array.isArray(entries)) return entries;
            console.warn('[Server] Gallery index invalide, reset...');
        }
    } catch (err) {
        console.error('[Server] Erreur lecture gallery index:', err.message);
    }
    return [];
};

const writeGalleryIndex = (entries) => {
    // Don't use writeDataAtomic — it spreads into object + adds checksum/version,
    // which corrupts the array structure. Use direct atomic write instead.
    const dir = path.dirname(GALLERY_INDEX);
    const tmpFile = path.join(dir, `.tmp.${crypto.randomBytes(4).toString('hex')}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf-8');
    fs.renameSync(tmpFile, GALLERY_INDEX);
};

// List gallery — returns metadata ONLY (no base64), with pagination
// Query params: ?page=1&limit=20&starred=true
app.get('/api/gallery', (req, res) => {
    const entries = readGalleryIndex();
    const starred = req.query.starred === 'true';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    let filtered = starred ? entries.filter(e => e.starred) : entries;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);

    // Return metadata only — images fetched via /api/gallery/:id/image
    const items = paged.map(({ prompt, scene, ...meta }) => ({
        ...meta,
        hasPrompt: !!prompt,
        // Include image URL for direct <img src> usage
        imageUrl: `/api/gallery/${meta.id}/image`,
    }));

    res.json({
        items,
        pagination: { page, limit, total, totalPages },
    });
});

// Get single gallery entry metadata + prompt (for lightbox detail view)
app.get('/api/gallery/:id', (req, res) => {
    if (!isValidGalleryId(req.params.id)) return res.status(400).json({ error: 'ID invalide' });
    const entries = readGalleryIndex();
    const entry = entries.find(e => e.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Image introuvable' });
    res.json({ ...entry, imageUrl: `/api/gallery/${entry.id}/image` });
});

// Serve gallery image as binary (for <img src="/api/gallery/:id/image">)
app.get('/api/gallery/:id/image', (req, res) => {
    if (!isValidGalleryId(req.params.id)) return res.status(400).end();
    const entries = readGalleryIndex();
    const entry = entries.find(e => e.id === req.params.id);
    if (!entry) return res.status(404).end();

    const safeName = path.basename(entry.filename);
    const imgPath = path.join(GALLERY_DIR, safeName);
    if (!fs.existsSync(imgPath)) return res.status(404).end();

    // Set cache headers — images are immutable (ID-based filenames)
    res.setHeader('Content-Type', entry.mimeType || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', fs.statSync(imgPath).size);
    fs.createReadStream(imgPath).pipe(res);
});

// Save a new gallery image (autorise 50MB)
app.post('/api/gallery', largePayloadMiddleware, (req, res) => {
    // Rate limit est géré globalement par apiLimiter désormais

    try {
        const { base64, mimeType, prompt, scene, modelName, locationName, accountHandle, seed, modelHash } = req.body;
        if (!base64 || typeof base64 !== 'string') return res.status(400).json({ error: 'base64 requis (string)' });

        // Validate image size
        const imageBytes = Math.ceil(base64.length * 3 / 4);
        if (imageBytes > MAX_IMAGE_SIZE_BYTES) {
            return res.status(400).json({ error: `Image trop grosse: ${(imageBytes / 1024 / 1024).toFixed(1)}MB (max ${MAX_IMAGE_SIZE_MB}MB)` });
        }

        // Validate mime type
        const safeMime = (mimeType || 'image/png');
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(safeMime)) {
            return res.status(400).json({ error: `Type MIME non supporté: ${safeMime}` });
        }

        const ext = safeMime.includes('jpeg') ? 'jpg' : safeMime.includes('webp') ? 'webp' : 'png';
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
            mimeType: safeMime,
            prompt: (prompt || '').slice(0, 5000),
            scene: scene || {},
            modelName: (modelName || '').slice(0, 100),
            locationName: (locationName || 'Sandbox').slice(0, 100),
            accountHandle: (accountHandle || '').slice(0, 100),
            seed: seed || null,
            modelHash: modelHash || null,
            timestamp: Date.now(),
            starred: false,
            fileSize: imgBuffer.length,
        };
        entries.unshift(entry);

        // Enforce max gallery size
        while (entries.length > MAX_GALLERY) {
            const removed = entries.pop();
            const removedPath = path.join(GALLERY_DIR, path.basename(removed.filename));
            try { fs.unlinkSync(removedPath); } catch { /* ignore */ }
        }

        writeGalleryIndex(entries);
        console.log(`[Server] Gallery +1 — ${entries.length} images, ${filename} (${(imageBytes / 1024).toFixed(0)} KB)`);
        res.json({ ok: true, id, total: entries.length });
    } catch (err) {
        console.error('[Server] Erreur gallery save:', err.message);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Toggle star on a gallery image
app.patch('/api/gallery/:id/star', (req, res) => {
    if (!isValidGalleryId(req.params.id)) return res.status(400).json({ error: 'ID invalide' });
    const entries = readGalleryIndex();
    const entry = entries.find(e => e.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Image introuvable' });
    entry.starred = !entry.starred;
    writeGalleryIndex(entries);
    res.json({ ok: true, starred: entry.starred });
});

// Delete a single gallery image
app.delete('/api/gallery/:id', (req, res) => {
    if (!isValidGalleryId(req.params.id)) return res.status(400).json({ error: 'ID invalide' });
    const entries = readGalleryIndex();
    const idx = entries.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Image introuvable' });
    const [removed] = entries.splice(idx, 1);
    const removedPath = path.join(GALLERY_DIR, path.basename(removed.filename));
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
            try { fs.unlinkSync(path.join(GALLERY_DIR, path.basename(entry.filename))); } catch { /* ignore */ }
        }
        writeGalleryIndex([]);
        console.log('[Server] Gallery videe');
        res.json({ ok: true });
    } catch (err) {
        console.error('[Server] Erreur clear gallery:', err.message);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// ============================================
// REFERENCE PHOTOS — multi-angle model refs
// ============================================
const REFS_DIR = path.join(SAVE_DIR, 'refs');
const MAX_REFS_PER_MODEL = 5;

if (!fs.existsSync(REFS_DIR)) {
    fs.mkdirSync(REFS_DIR, { recursive: true });
}

const isValidModelId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_\-]{3,80}$/.test(id);
const isValidRefId = (id) => typeof id === 'string' && /^ref_[a-zA-Z0-9_\-]+$/.test(id);

const getModelRefsDir = (modelId) => {
    const safe = sanitizeFilename(modelId);
    return path.join(REFS_DIR, safe);
};

const readRefsIndex = (modelId) => {
    const dir = getModelRefsDir(modelId);
    const indexPath = path.join(dir, 'index.json');
    try {
        if (fs.existsSync(indexPath)) return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch { }
    return [];
};

const writeRefsIndex = (modelId, entries) => {
    const dir = getModelRefsDir(modelId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const indexPath = path.join(dir, 'index.json');
    const tmpFile = path.join(dir, `.tmp.${crypto.randomBytes(4).toString('hex')}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf-8');
    fs.renameSync(tmpFile, indexPath);
};

// Upload reference photo(s) for a model (autorise 50MB)
app.post('/api/refs/:modelId', largePayloadMiddleware, (req, res) => {
    try {
        const { modelId } = req.params;
        if (!isValidModelId(modelId)) return res.status(400).json({ error: 'Model ID invalide' });

        const { photos } = req.body; // [{ base64, mimeType }]
        if (!Array.isArray(photos) || photos.length === 0) {
            return res.status(400).json({ error: 'photos[] requis' });
        }

        const existing = readRefsIndex(modelId);
        const remaining = MAX_REFS_PER_MODEL - existing.length;
        if (remaining <= 0) {
            return res.status(400).json({ error: `Max ${MAX_REFS_PER_MODEL} photos de reference atteint` });
        }

        const toAdd = photos.slice(0, remaining);
        const dir = getModelRefsDir(modelId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const added = [];
        for (const photo of toAdd) {
            if (!photo.base64 || typeof photo.base64 !== 'string') continue;
            const safeMime = photo.mimeType || 'image/jpeg';
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(safeMime)) continue;

            // Validate size
            const imageBytes = Math.ceil(photo.base64.length * 3 / 4);
            if (imageBytes > MAX_IMAGE_SIZE_BYTES) continue;

            const ext = safeMime.includes('jpeg') ? 'jpg' : safeMime.includes('webp') ? 'webp' : 'png';
            const id = `ref_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            const filename = `${id}.${ext}`;

            const imgBuffer = Buffer.from(photo.base64, 'base64');
            fs.writeFileSync(path.join(dir, filename), imgBuffer);

            added.push({ id, filename, mimeType: safeMime, fileSize: imgBuffer.length, timestamp: Date.now() });
        }

        const updated = [...existing, ...added];
        writeRefsIndex(modelId, updated);
        console.log(`[Server] Refs ${modelId}: +${added.length} → ${updated.length} total`);
        res.json({ ok: true, added: added.length, total: updated.length });
    } catch (err) {
        console.error('[Server] Erreur ref upload:', err.message);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// List reference photos for a model (metadata only)
app.get('/api/refs/:modelId', (req, res) => {
    const { modelId } = req.params;
    if (!isValidModelId(modelId)) return res.status(400).json({ error: 'Model ID invalide' });
    const entries = readRefsIndex(modelId);
    res.json(entries.map(e => ({
        ...e,
        imageUrl: `/api/refs/${modelId}/${e.id}/image`,
    })));
});

// Serve a reference photo as binary
app.get('/api/refs/:modelId/:refId/image', (req, res) => {
    const { modelId, refId } = req.params;
    if (!isValidModelId(modelId) || !isValidRefId(refId)) return res.status(400).end();
    const entries = readRefsIndex(modelId);
    const entry = entries.find(e => e.id === refId);
    if (!entry) return res.status(404).end();

    const imgPath = path.join(getModelRefsDir(modelId), path.basename(entry.filename));
    if (!fs.existsSync(imgPath)) return res.status(404).end();

    res.setHeader('Content-Type', entry.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', fs.statSync(imgPath).size);
    fs.createReadStream(imgPath).pipe(res);
});

// Serve a reference photo as base64 (for prompt generation)
app.get('/api/refs/:modelId/:refId/base64', (req, res) => {
    const { modelId, refId } = req.params;
    if (!isValidModelId(modelId) || !isValidRefId(refId)) return res.status(400).end();
    const entries = readRefsIndex(modelId);
    const entry = entries.find(e => e.id === refId);
    if (!entry) return res.status(404).json({ error: 'Ref introuvable' });

    const imgPath = path.join(getModelRefsDir(modelId), path.basename(entry.filename));
    if (!fs.existsSync(imgPath)) return res.status(404).json({ error: 'Fichier introuvable' });

    const buf = fs.readFileSync(imgPath);
    res.json({ base64: buf.toString('base64'), mimeType: entry.mimeType });
});

// Delete a specific reference photo
app.delete('/api/refs/:modelId/:refId', (req, res) => {
    const { modelId, refId } = req.params;
    if (!isValidModelId(modelId) || !isValidRefId(refId)) return res.status(400).json({ error: 'ID invalide' });
    const entries = readRefsIndex(modelId);
    const idx = entries.findIndex(e => e.id === refId);
    if (idx === -1) return res.status(404).json({ error: 'Ref introuvable' });

    const [removed] = entries.splice(idx, 1);
    try { fs.unlinkSync(path.join(getModelRefsDir(modelId), path.basename(removed.filename))); } catch { }
    writeRefsIndex(modelId, entries);
    console.log(`[Server] Refs ${modelId}: -1 → ${entries.length} restantes`);
    res.json({ ok: true, remaining: entries.length });
});

// ============================================
// LOCATION REFERENCE PHOTOS — environment anchoring
// ============================================
const LOC_REFS_DIR = path.join(SAVE_DIR, 'location-refs');
const MAX_REFS_PER_LOCATION = 3;

if (!fs.existsSync(LOC_REFS_DIR)) {
    fs.mkdirSync(LOC_REFS_DIR, { recursive: true });
}

const isValidLocationId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_\-]{3,80}$/.test(id);
const isValidLocRefId = (id) => typeof id === 'string' && /^locref_[a-zA-Z0-9_\-]+$/.test(id);

const getLocationRefsDir = (locationId) => {
    const safe = sanitizeFilename(locationId);
    return path.join(LOC_REFS_DIR, safe);
};

const readLocRefsIndex = (locationId) => {
    const dir = getLocationRefsDir(locationId);
    const indexPath = path.join(dir, 'index.json');
    try {
        if (fs.existsSync(indexPath)) return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch { }
    return [];
};

const writeLocRefsIndex = (locationId, entries) => {
    const dir = getLocationRefsDir(locationId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const indexPath = path.join(dir, 'index.json');
    const tmpFile = path.join(dir, `.tmp.${crypto.randomBytes(4).toString('hex')}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf-8');
    fs.renameSync(tmpFile, indexPath);
};

// Upload reference photo(s) for a location (autorise 50MB)
app.post('/api/location-refs/:locationId', largePayloadMiddleware, (req, res) => {
    try {
        const { locationId } = req.params;
        if (!isValidLocationId(locationId)) return res.status(400).json({ error: 'Location ID invalide' });

        const { photos } = req.body; // [{ base64, mimeType }]
        if (!Array.isArray(photos) || photos.length === 0) {
            return res.status(400).json({ error: 'photos[] requis' });
        }

        const existing = readLocRefsIndex(locationId);
        const remaining = MAX_REFS_PER_LOCATION - existing.length;
        if (remaining <= 0) {
            return res.status(400).json({ error: `Max ${MAX_REFS_PER_LOCATION} photos de reference atteint` });
        }

        const toAdd = photos.slice(0, remaining);
        const dir = getLocationRefsDir(locationId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const added = [];
        for (const photo of toAdd) {
            if (!photo.base64 || typeof photo.base64 !== 'string') continue;
            const safeMime = photo.mimeType || 'image/jpeg';
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(safeMime)) continue;

            const imageBytes = Math.ceil(photo.base64.length * 3 / 4);
            if (imageBytes > MAX_IMAGE_SIZE_BYTES) continue;

            const ext = safeMime.includes('jpeg') ? 'jpg' : safeMime.includes('webp') ? 'webp' : 'png';
            const id = `locref_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            const filename = `${id}.${ext}`;

            const imgBuffer = Buffer.from(photo.base64, 'base64');
            fs.writeFileSync(path.join(dir, filename), imgBuffer);

            added.push({ id, filename, mimeType: safeMime, fileSize: imgBuffer.length, timestamp: Date.now() });
        }

        const updated = [...existing, ...added];
        writeLocRefsIndex(locationId, updated);
        console.log(`[Server] Location refs ${locationId}: +${added.length} → ${updated.length} total`);
        res.json({ ok: true, added: added.length, total: updated.length });
    } catch (err) {
        console.error('[Server] Erreur location ref upload:', err.message);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// List reference photos for a location (metadata only)
app.get('/api/location-refs/:locationId', (req, res) => {
    const { locationId } = req.params;
    if (!isValidLocationId(locationId)) return res.status(400).json({ error: 'Location ID invalide' });
    const entries = readLocRefsIndex(locationId);
    res.json(entries.map(e => ({
        ...e,
        imageUrl: `/api/location-refs/${locationId}/${e.id}/image`,
    })));
});

// Serve the FIRST location reference photo (thumbnail for cards)
app.get('/api/location-refs/:locationId/first-image', (req, res) => {
    const { locationId } = req.params;
    if (!isValidLocationId(locationId)) return res.status(400).end();
    const entries = readLocRefsIndex(locationId);
    if (entries.length === 0) return res.status(404).end();

    const entry = entries[0];
    const imgPath = path.join(getLocationRefsDir(locationId), path.basename(entry.filename));
    if (!fs.existsSync(imgPath)) return res.status(404).end();

    res.setHeader('Content-Type', entry.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', fs.statSync(imgPath).size);
    fs.createReadStream(imgPath).pipe(res);
});

// Serve a location reference photo as binary
app.get('/api/location-refs/:locationId/:refId/image', (req, res) => {
    const { locationId, refId } = req.params;
    if (!isValidLocationId(locationId) || !isValidLocRefId(refId)) return res.status(400).end();
    const entries = readLocRefsIndex(locationId);
    const entry = entries.find(e => e.id === refId);
    if (!entry) return res.status(404).end();

    const imgPath = path.join(getLocationRefsDir(locationId), path.basename(entry.filename));
    if (!fs.existsSync(imgPath)) return res.status(404).end();

    res.setHeader('Content-Type', entry.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', fs.statSync(imgPath).size);
    fs.createReadStream(imgPath).pipe(res);
});

// Serve a location reference photo as base64 (for prompt generation)
app.get('/api/location-refs/:locationId/:refId/base64', (req, res) => {
    const { locationId, refId } = req.params;
    if (!isValidLocationId(locationId) || !isValidLocRefId(refId)) return res.status(400).end();
    const entries = readLocRefsIndex(locationId);
    const entry = entries.find(e => e.id === refId);
    if (!entry) return res.status(404).json({ error: 'Ref introuvable' });

    const imgPath = path.join(getLocationRefsDir(locationId), path.basename(entry.filename));
    if (!fs.existsSync(imgPath)) return res.status(404).json({ error: 'Fichier introuvable' });

    const buf = fs.readFileSync(imgPath);
    res.json({ base64: buf.toString('base64'), mimeType: entry.mimeType });
});

// Delete a specific location reference photo
app.delete('/api/location-refs/:locationId/:refId', (req, res) => {
    const { locationId, refId } = req.params;
    if (!isValidLocationId(locationId) || !isValidLocRefId(refId)) return res.status(400).json({ error: 'ID invalide' });
    const entries = readLocRefsIndex(locationId);
    const idx = entries.findIndex(e => e.id === refId);
    if (idx === -1) return res.status(404).json({ error: 'Ref introuvable' });

    const [removed] = entries.splice(idx, 1);
    try { fs.unlinkSync(path.join(getLocationRefsDir(locationId), path.basename(removed.filename))); } catch { }
    writeLocRefsIndex(locationId, entries);
    console.log(`[Server] Location refs ${locationId}: -1 → ${entries.length} restantes`);
    res.json({ ok: true, remaining: entries.length });
});

// ============================================
// ERROR HANDLER — attrape les erreurs non gérées (DOIT être après les routes)
// ============================================
app.use((err, _req, res, _next) => {
    console.error('[Server] Erreur non gérée:', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ============================================
// STARTUP
// ============================================
const PORT = 3001;

// Clean up temp files from previous crashes
cleanupTempFiles();

// Validate data integrity on startup
const startupData = readData();

console.log(`\n  💎 Velvet Studio Server`);
console.log(`  ➜  API:         http://localhost:${PORT}/api`);
console.log(`  ➜  CORS:        localhost + LAN + Tailscale (dynamique)`);
console.log(`  ➜  Sauvegarde:  ${SAVE_DIR}/`);
console.log(`  ➜  Galerie:     ${GALLERY_DIR}/ (max ${MAX_GALLERY} images)`);
console.log(`  ➜  Backups:     ${MAX_BACKUPS} rotations automatiques`);
console.log(`  ➜  Données:     ${startupData.models?.length || 0} modele(s)`);
console.log(`  ➜  Sécurité:    écriture atomique + validation + rate limit + path sanitization`);

const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`  ➜  Statut:      en ligne sur le port ${PORT}`);
    // Show all network addresses for easy Tailscale/LAN connection
    try {
        const os = await import('os');
        const nets = os.networkInterfaces();
        for (const [name, addrs] of Object.entries(nets)) {
            for (const addr of addrs) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    console.log(`  ➜  Réseau:      http://${addr.address}:${PORT}  (${name})`);
                }
            }
        }
    } catch { }
    console.log('');
});

// ============================================
// GRACEFUL SHUTDOWN — sauvegarde propre à la fermeture
// ============================================
const gracefulShutdown = (signal) => {
    console.log(`\n[Server] ${signal} reçu — arrêt propre...`);
    cleanupTempFiles();
    server.close(() => {
        console.log('[Server] Serveur arrêté proprement.');
        process.exit(0);
    });
    // Force exit after 5s if server.close hangs
    setTimeout(() => {
        console.warn('[Server] Arrêt forcé après timeout');
        process.exit(1);
    }, 5000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled errors
process.on('uncaughtException', (err) => {
    console.error('[Server] ⚠ EXCEPTION NON GÉRÉE:', err.message);
    console.error(err.stack);
    // Don't exit — try to keep serving
});

process.on('unhandledRejection', (reason) => {
    console.error('[Server] ⚠ PROMESSE REJETÉE:', reason);
});

