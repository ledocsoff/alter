const STORAGE_KEY = 'velvet_studio_v4';
const HISTORY_KEY = 'velvet_history';
const TEMPLATES_KEY = 'velvet_templates';
const GALLERY_KEY = 'velvet_gallery';
const API_KEY_KEY = 'velvet_api_key';
const API_PROVIDER_KEY = 'velvet_api_provider'; // 'ai_studio' | 'vertex_ai'

// In Electron production (file://), API calls must target localhost:3001 directly
// In browser/dev mode, Vite proxy handles /api → localhost:3001
const API_BASE = (typeof window !== 'undefined' && window.location.protocol === 'file:')
    ? 'http://localhost:3001'
    : '';

// ============================================
// FILE SYNC — Sauvegarde automatique vers le serveur
// ============================================
let syncTimeout = null;
let hasPendingSync = false;

const buildSyncPayload = () => ({
    dataVersion: 1,
    models: getSavedModels(),
    templates: getSceneTemplates(),
    history: getPromptHistory(),
});

const syncToServer = () => {
    clearTimeout(syncTimeout);
    hasPendingSync = true;
    syncTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildSyncPayload()),
            });
            if (res.ok) {
                hasPendingSync = false;
                window.dispatchEvent(new CustomEvent('velvet:synced'));
            }
        } catch (err) {
            console.warn('[Velvet] Sync serveur echoue:', err.message);
        }
    }, 1500); // 1.5s debounce — reduces redundant writes during rapid edits
};

// Force sync immédiat (pour beforeunload ou appel explicite)
export const syncNow = () => {
    if (!hasPendingSync) return;
    clearTimeout(syncTimeout);
    try {
        // sendBeacon fonctionne même pendant la fermeture de l'onglet
        const payload = JSON.stringify(buildSyncPayload());
        const sent = navigator.sendBeacon(`${API_BASE}/api/save`, new Blob([payload], { type: 'application/json' }));
        if (sent) hasPendingSync = false;
    } catch (err) {
        console.warn('[NanaBanana] Sync beacon echoue:', err.message);
    }
};

// Garantir la sauvegarde même si l'utilisateur ferme l'onglet
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', syncNow);
}

/**
 * Charge les données depuis le serveur (sauvegarde/) dans localStorage.
 * Appelé une seule fois au démarrage de l'app.
 * Retourne les modèles chargés.
 */
export const loadFromServer = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/load`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Populate localStorage from server data
        if (data.models && data.models.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.models));
        }
        if (data.templates && data.templates.length > 0) {
            localStorage.setItem(TEMPLATES_KEY, JSON.stringify(data.templates));
        }
        if (data.history && data.history.length > 0) {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history));
        }

        console.log(`[NanaBanana] Charge depuis sauvegarde/: ${data.models?.length || 0} modele(s)`);
        return data.models || [];
    } catch (err) {
        console.warn('[NanaBanana] Serveur indisponible, fallback localStorage');
        return getSavedModels();
    }
};

// ============================================
// API KEY (localStorage only — jamais dans les fichiers)
// Une clé par provider : ai_studio et vertex_ai
// ============================================
const _apiKeyFor = (provider) => `${API_KEY_KEY}_${provider}`;

// Migration: si l'ancienne clé unique existe, la déplacer vers ai_studio
(() => {
    try {
        const old = localStorage.getItem(API_KEY_KEY);
        if (old) {
            localStorage.setItem(_apiKeyFor('ai_studio'), old);
            localStorage.removeItem(API_KEY_KEY);
        }
    } catch { }
})();

export const getApiKey = (provider) => {
    const p = provider || getApiProvider();
    try { return localStorage.getItem(_apiKeyFor(p)) || ''; } catch { return ''; }
};

export const saveApiKey = (key, provider) => {
    const p = provider || getApiProvider();
    localStorage.setItem(_apiKeyFor(p), key);
};

export const removeApiKey = (provider) => {
    const p = provider || getApiProvider();
    localStorage.removeItem(_apiKeyFor(p));
};

export const getApiProvider = () => {
    try { return localStorage.getItem(API_PROVIDER_KEY) || 'ai_studio'; } catch { return 'ai_studio'; }
};

export const saveApiProvider = (provider) => {
    localStorage.setItem(API_PROVIDER_KEY, provider);
};

// ============================================
// LAST SESSION — Retour rapide au dernier studio
// ============================================
const LAST_SESSION_KEY = 'velvet_last_session';

export const saveLastSession = (info) => {
    try { localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({ ...info, timestamp: Date.now() })); } catch { }
};

export const getLastSession = () => {
    try { return JSON.parse(localStorage.getItem(LAST_SESSION_KEY)) || null; } catch { return null; }
};

// ============================================
// LECTURE GLOBALE
// ============================================
export const getSavedModels = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const parsed = data ? JSON.parse(data) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (error) {
        console.error("[NanaBanana] Erreur lecture localStorage:", error);
        return [];
    }
};

const _saveAll = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    syncToServer();
};

// ============================================
// NIVEAU 1 : MODELS (CRUD)
// ============================================
export const saveModelData = (newModel) => {
    const models = getSavedModels();
    const id = newModel.id || `mod_${crypto.randomUUID()}`;
    const modelData = {
        ...newModel,
        id,
        accounts: newModel.accounts || []
    };

    const index = models.findIndex(m => m.id === id);
    if (index >= 0) models[index] = modelData;
    else models.push(modelData);

    _saveAll(models);
    return models;
};

export const deleteModelData = (modelId) => {
    let models = getSavedModels();
    models = models.filter(m => m.id !== modelId);
    _saveAll(models);
    return models;
};

// ============================================
// NIVEAU 2 : ACCOUNTS (CRUD)
// ============================================
export const saveAccountData = (modelId, accountData) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    if (!model) return null;

    const id = accountData.id || `acc_${crypto.randomUUID()}`;
    const account = {
        ...accountData,
        id,
        locations: accountData.locations || []
    };

    const index = model.accounts.findIndex(a => a.id === id);
    if (index >= 0) model.accounts[index] = account;
    else model.accounts.push(account);

    _saveAll(models);
    return models;
};

export const deleteAccountData = (modelId, accountId) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    if (!model) return null;

    model.accounts = model.accounts.filter(a => a.id !== accountId);
    _saveAll(models);
    return models;
};

// ============================================
// NIVEAU 3 : LOCATIONS (CRUD)
// ============================================

// Génère une seed numérique 6 chiffres pour la cohérence visuelle
export const generateSeed = () => Math.floor(100000 + Math.random() * 900000);

export const saveLocationData = (modelId, accountId, locationData) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    const account = model?.accounts.find(a => a.id === accountId);
    if (!account) return null;

    const id = locationData.id || `loc_${crypto.randomUUID()}`;

    // Préserver la seed existante, ou en générer une nouvelle
    const existingLoc = account.locations.find(l => l.id === id);
    const location = {
        ...locationData,
        id,
        name: locationData.name || "Nouveau Lieu",
        environment: locationData.environment || "",
        default_lighting: locationData.default_lighting || "",
        default_vibe: locationData.default_vibe || "",
        time_of_day: locationData.time_of_day || "",
        anchor_details: locationData.anchor_details || "",
        color_palette: locationData.color_palette || "",
        seed: locationData.seed || existingLoc?.seed || generateSeed(),
    };

    const index = account.locations.findIndex(l => l.id === id);
    if (index >= 0) account.locations[index] = location;
    else account.locations.push(location);

    _saveAll(models);
    return models;
};

export const deleteLocationData = (modelId, accountId, locationId) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    const account = model?.accounts.find(a => a.id === accountId);
    if (!account) return null;

    account.locations = account.locations.filter(l => l.id !== locationId);
    _saveAll(models);
    return models;
};

// ============================================
// PROMPT HISTORY
// ============================================
const MAX_HISTORY = 50;

export const getPromptHistory = () => {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const savePromptToHistory = (promptJSON, meta = {}) => {
    const history = getPromptHistory();
    const entry = {
        id: `hist_${Date.now()}`,
        prompt: promptJSON,
        modelName: meta.modelName || '',
        locationName: meta.locationName || 'Sandbox',
        accountHandle: meta.accountHandle || '',
        timestamp: Date.now(),
    };
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    syncToServer();
    return history;
};

export const clearPromptHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    syncToServer();
    return [];
};

// ============================================
// SCENE TEMPLATES
// ============================================
export const getSceneTemplates = () => {
    try {
        const data = localStorage.getItem(TEMPLATES_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const saveSceneTemplate = (name, scene) => {
    const templates = getSceneTemplates();
    const { environment, location_meta, ...sceneWithoutLocation } = scene;
    const entry = {
        id: `tpl_${Date.now()}`,
        name,
        scene: sceneWithoutLocation,
        createdAt: Date.now(),
    };
    templates.unshift(entry);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    syncToServer();
    return templates;
};

export const deleteSceneTemplate = (templateId) => {
    let templates = getSceneTemplates();
    templates = templates.filter(t => t.id !== templateId);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    syncToServer();
    return templates;
};

// ============================================
// EXPORT / IMPORT
// ============================================
export const exportAllData = () => {
    return JSON.stringify({
        version: 'velvet_v4',
        exportedAt: new Date().toISOString(),
        models: getSavedModels(),
        templates: getSceneTemplates(),
        history: getPromptHistory(),
    }, null, 2);
};

export const importAllData = (jsonString) => {
    let data;
    try {
        data = JSON.parse(jsonString);
    } catch {
        throw new Error('JSON invalide — le fichier est corrompu ou mal formé');
    }

    // Validate top-level structure
    if (!data || typeof data !== 'object') throw new Error('Format invalide: objet attendu');
    if (!data.version) throw new Error('Format invalide: champ "version" manquant (pas un export NanaBanana ?)');
    if (!Array.isArray(data.models)) throw new Error('Format invalide: "models" doit être un tableau');

    // Validate each model has minimum required fields
    for (let i = 0; i < data.models.length; i++) {
        const m = data.models[i];
        if (!m || typeof m !== 'object') throw new Error(`Modèle #${i + 1}: objet invalide`);
        if (!m.id || typeof m.id !== 'string') throw new Error(`Modèle #${i + 1}: id manquant ou invalide`);
        if (!m.name || typeof m.name !== 'string') throw new Error(`Modèle #${i + 1}: nom manquant ou invalide`);
    }

    // Validate optional arrays
    if (data.templates !== undefined && !Array.isArray(data.templates)) {
        throw new Error('Format invalide: "templates" doit être un tableau');
    }
    if (data.history !== undefined && !Array.isArray(data.history)) {
        throw new Error('Format invalide: "history" doit être un tableau');
    }

    _saveAll(data.models);
    if (data.templates) {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(data.templates));
    }
    if (data.history) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history));
    }
    syncToServer();
    return data.models;
};

// ============================================
// LOCATION DUPLICATION
// ============================================
export const duplicateLocation = (fromModelId, fromAccountId, locationId, toModelId, toAccountId) => {
    const models = getSavedModels();
    const fromModel = models.find(m => m.id === fromModelId);
    const fromAccount = fromModel?.accounts.find(a => a.id === fromAccountId);
    const location = fromAccount?.locations.find(l => l.id === locationId);
    if (!location) return null;

    const toModel = models.find(m => m.id === toModelId);
    const toAccount = toModel?.accounts.find(a => a.id === toAccountId);
    if (!toAccount) return null;

    const { id, ...locWithoutId } = location;
    const newLoc = {
        ...locWithoutId,
        id: `loc_${crypto.randomUUID()}`,
        name: `${location.name} (copie)`,
    };
    toAccount.locations.push(newLoc);
    _saveAll(models);
    return models;
};

// ============================================
// LOCATION LOCK SCORE
// ============================================
export const getLocationLockScore = (location) => {
    const fields = [
        'environment', 'default_lighting', 'default_vibe',
        'time_of_day', 'anchor_details', 'color_palette',
    ];
    const filled = fields.filter(f => location[f] && location[f].trim()).length;
    return { filled, total: fields.length };
};

// ============================================
// GALERIE D'IMAGES — Server filesystem API
// ============================================

export const getGallery = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/gallery`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur chargement galerie:', err.message);
        return [];
    }
};

export const saveToGallery = async (imageData, meta = {}) => {
    try {
        const res = await fetch(`${API_BASE}/api/gallery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                base64: imageData.base64,
                mimeType: imageData.mimeType || 'image/png',
                prompt: meta.prompt || '',
                scene: meta.scene || {},
                modelName: meta.modelName || '',
                locationName: meta.locationName || 'Sandbox',
                accountHandle: meta.accountHandle || '',
                seed: meta.seed || null,
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur sauvegarde galerie:', err.message);
        return null;
    }
};

export const toggleGalleryStar = async (imageId) => {
    try {
        const res = await fetch(`${API_BASE}/api/gallery/${imageId}/star`, { method: 'PATCH' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur star galerie:', err.message);
        return null;
    }
};

export const deleteFromGallery = async (imageId) => {
    try {
        const res = await fetch(`${API_BASE}/api/gallery/${imageId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur suppression galerie:', err.message);
        return null;
    }
};

export const clearGallery = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/gallery`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur vidage galerie:', err.message);
        return null;
    }
};
