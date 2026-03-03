import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVE_DIR = path.join(__dirname, 'sauvegarde');
const DATA_FILE = path.join(SAVE_DIR, 'data.json');

// Ensure save directory exists
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
}

const EMPTY_DATA = { models: [], templates: [], history: [] };

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

const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

const app = express();
app.use(express.json({ limit: '50mb' }));

// Load all data
app.get('/api/load', (_req, res) => {
    res.json(readData());
});

// Save all data
app.post('/api/save', (req, res) => {
    try {
        writeData(req.body);
        const n = req.body.models?.length || 0;
        console.log(`[Server] Sauvegarde OK — ${n} modele(s) → ${DATA_FILE}`);
        res.json({ ok: true });
    } catch (err) {
        console.error('[Server] Erreur ecriture:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n  🍌 NanaBanana Server`);
    console.log(`  ➜  API:         http://localhost:${PORT}/api`);
    console.log(`  ➜  Sauvegarde:  ${SAVE_DIR}/\n`);
});
