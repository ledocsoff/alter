const STORAGE_KEY = 'velvet_studio_v4';
const HISTORY_KEY = 'velvet_history';
const TEMPLATES_KEY = 'velvet_templates';

const API_KEY_KEY = 'velvet_api_key';

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
            console.warn('[Velvet] Sync serveur échoué:', err.message);
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
        console.warn('[Velvet] Sync beacon échoué:', err.message);
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

        // Validate server response
        if (!data || typeof data !== 'object') throw new Error('Réponse serveur invalide');

        // Always overwrite localStorage from server (source of truth)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.models || []));
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(data.templates || []));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history || []));

        console.log(`[Velvet] Chargé depuis sauvegarde/: ${data.models?.length || 0} modèle(s)`);
        return data.models || [];
    } catch (err) {
        console.warn('[Velvet] Serveur indisponible, fallback localStorage:', err.message);
        return getSavedModels();
    }
};

// ============================================
// API KEY (localStorage only — Google AI Studio)
// Obfuscation base64 pour éviter la lecture directe dans DevTools
// ============================================
const _apiStorageKey = `${API_KEY_KEY}_ai_studio`;

const _obfuscate = (key) => { try { return btoa(key); } catch { return key; } };
const _deobfuscate = (val) => { try { return atob(val); } catch { return val; } };

// Migration: anciennes clés vers le format actuel
(() => {
    try {
        // Old single-key format
        const old = localStorage.getItem(API_KEY_KEY);
        if (old) {
            localStorage.setItem(_apiStorageKey, _obfuscate(old));
            localStorage.removeItem(API_KEY_KEY);
        }
        // Migrate plaintext key
        const k = localStorage.getItem(_apiStorageKey);
        if (k && !k.includes('=') && k.startsWith('AI')) {
            localStorage.setItem(_apiStorageKey, _obfuscate(k));
        }
        // Clean up old vertex_ai key if it exists
        localStorage.removeItem(`${API_KEY_KEY}_vertex_ai`);
        localStorage.removeItem('velvet_api_provider');
    } catch { }
})();

export const getApiKey = () => {
    try {
        const stored = localStorage.getItem(_apiStorageKey) || '';
        return stored ? _deobfuscate(stored) : '';
    } catch { return ''; }
};

export const saveApiKey = (key) => {
    localStorage.setItem(_apiStorageKey, _obfuscate(key));
};

export const removeApiKey = () => {
    localStorage.removeItem(_apiStorageKey);
};

// ============================================
// LAST SESSION — Retour rapide au dernier studio
// ============================================
const LAST_SESSION_KEY = 'velvet_last_session';

export const saveLastSession = (info) => {
    try { localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({ ...info, timestamp: Date.now() })); } catch { }
};

export const getLastSession = () => {
    try {
        const session = JSON.parse(localStorage.getItem(LAST_SESSION_KEY));
        if (!session) return null;
        return session;
    } catch { return null; }
};

// ============================================
// LECTURE GLOBALE — avec auto-recovery
// ============================================
export const getSavedModels = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            console.error('[Velvet] Données corrompues détectées, nettoyage...');
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }
        return parsed;
    } catch (error) {
        console.error('[Velvet] Erreur critique localStorage — reset:', error.message);
        try { localStorage.removeItem(STORAGE_KEY); } catch { }
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
    const id = newModel.id || `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

    const id = accountData.id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

export const duplicateAccountData = (modelId, accountId) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    const account = model?.accounts?.find(a => a.id === accountId);
    if (!account) return null;

    const { id, ...rest } = account;
    const newAccount = {
        ...rest,
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        handle: `${account.handle} (copie)`,
        locations: (account.locations || []).map((loc, i) => ({
            ...loc,
            id: `loc_${Date.now() + i}_${Math.random().toString(36).slice(2, 8)}`,
        })),
    };
    model.accounts.push(newAccount);
    _saveAll(models);
    return models;
};

export const duplicateLocationLocal = (modelId, accountId, locationId) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    const account = model?.accounts?.find(a => a.id === accountId);
    const location = account?.locations?.find(l => l.id === locationId);
    if (!location) return null;

    const { id, ...rest } = location;
    const newLoc = {
        ...rest,
        id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: `${location.name} (copie)`,
        seed: generateSeed(),
    };
    account.locations.push(newLoc);
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

    const id = locationData.id || `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
        ai_presets: locationData.ai_presets || existingLoc?.ai_presets || [],
        ai_outfits: locationData.ai_outfits || existingLoc?.ai_outfits || [],
        ai_poses: locationData.ai_poses || existingLoc?.ai_poses || [],
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
// REORDER — Drag & drop support
// ============================================
export const reorderModels = (fromIndex, toIndex) => {
    const models = getSavedModels();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= models.length || toIndex >= models.length) return null;
    const [moved] = models.splice(fromIndex, 1);
    models.splice(toIndex, 0, moved);
    _saveAll(models);
    return models;
};

export const reorderAccounts = (modelId, fromIndex, toIndex) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    if (!model?.accounts || fromIndex < 0 || toIndex < 0) return null;
    const [moved] = model.accounts.splice(fromIndex, 1);
    model.accounts.splice(toIndex, 0, moved);
    _saveAll(models);
    return models;
};

export const reorderLocations = (modelId, accountId, fromIndex, toIndex) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    const account = model?.accounts?.find(a => a.id === accountId);
    if (!account?.locations || fromIndex < 0 || toIndex < 0) return null;
    const [moved] = account.locations.splice(fromIndex, 1);
    account.locations.splice(toIndex, 0, moved);
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
        locationName: meta.locationName || 'Lieu inconnu',
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

export const getGallery = async (options = {}) => {
    try {
        const params = new URLSearchParams();
        if (options.page) params.set('page', options.page);
        if (options.limit) params.set('limit', options.limit);
        if (options.starred) params.set('starred', 'true');
        const url = `${API_BASE}/api/gallery${params.toString() ? '?' + params : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur chargement galerie:', err.message);
        return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
};

export const getGalleryImage = async (imageId) => {
    try {
        const res = await fetch(`${API_BASE}/api/gallery/${imageId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur chargement image:', err.message);
        return null;
    }
};

export const galleryImageUrl = (imageId) => `${API_BASE}/api/gallery/${imageId}/image`;

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
                locationName: meta.locationName || 'Lieu inconnu',
                accountHandle: meta.accountHandle || '',
                seed: meta.seed || null,
                modelHash: meta.modelHash || null,
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

// ============================================
// REFERENCE PHOTOS — multi-angle model refs
// ============================================

/**
 * Upload reference photos for a model
 * @param {string} modelId
 * @param {Array<{base64: string, mimeType: string}>} photos
 * @returns {Promise<{ok: boolean, added: number, total: number}>}
 */
export const uploadModelRefs = async (modelId, photos) => {
    try {
        const res = await fetch(`${API_BASE}/api/refs/${encodeURIComponent(modelId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photos }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur upload refs:', err.message);
        return null;
    }
};

/**
 * List reference photos metadata for a model (no base64)
 * @param {string} modelId
 * @returns {Promise<Array>}
 */
export const getModelRefs = async (modelId) => {
    try {
        const res = await fetch(`${API_BASE}/api/refs/${encodeURIComponent(modelId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur get refs:', err.message);
        return [];
    }
};

/**
 * Load a single reference photo as base64 (for prompt generation)
 * Uses in-memory cache to avoid redundant server calls
 * @param {string} modelId
 * @param {string} refId
 * @returns {Promise<{base64: string, mimeType: string}|null>}
 */
const _refCache = new Map();
let _refCacheModelId = null;

export const loadModelRefBase64 = async (modelId, refId) => {
    // Invalidate cache if model changed
    if (_refCacheModelId !== modelId) {
        _refCache.clear();
        _refCacheModelId = modelId;
    }
    const cacheKey = `${modelId}:${refId}`;
    if (_refCache.has(cacheKey)) return _refCache.get(cacheKey);
    try {
        const res = await fetch(`${API_BASE}/api/refs/${encodeURIComponent(modelId)}/${encodeURIComponent(refId)}/base64`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        _refCache.set(cacheKey, data);
        return data;
    } catch (err) {
        console.warn('[Velvet] Erreur load ref base64:', err.message);
        return null;
    }
};

/**
 * Delete a reference photo
 * @param {string} modelId
 * @param {string} refId
 */
export const deleteModelRef = async (modelId, refId) => {
    try {
        const res = await fetch(`${API_BASE}/api/refs/${encodeURIComponent(modelId)}/${encodeURIComponent(refId)}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur delete ref:', err.message);
        return null;
    }
};

/**
 * Get the image URL for a reference photo (for <img> display)
 * @param {string} modelId
 * @param {string} refId
 */
export const refImageUrl = (modelId, refId) => `${API_BASE}/api/refs/${encodeURIComponent(modelId)}/${encodeURIComponent(refId)}/image`;

// ============================================
// LOCATION REFERENCE PHOTOS
// ============================================

let _locRefCache = new Map();
let _locRefCacheLocationId = null;

/**
 * List reference photos metadata for a location (no base64)
 */
export const getLocationRefs = async (locationId) => {
    try {
        const res = await fetch(`${API_BASE}/api/location-refs/${encodeURIComponent(locationId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur get location refs:', err.message);
        return [];
    }
};

/**
 * Load a single location ref as base64 (with cache)
 */
export const loadLocationRefBase64 = async (locationId, refId) => {
    if (_locRefCacheLocationId !== locationId) {
        _locRefCache.clear();
        _locRefCacheLocationId = locationId;
    }
    const cacheKey = `${locationId}:${refId}`;
    if (_locRefCache.has(cacheKey)) return _locRefCache.get(cacheKey);
    try {
        const res = await fetch(`${API_BASE}/api/location-refs/${encodeURIComponent(locationId)}/${encodeURIComponent(refId)}/base64`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        _locRefCache.set(cacheKey, data);
        return data;
    } catch (err) {
        console.warn('[Velvet] Erreur load location ref base64:', err.message);
        return null;
    }
};

/**
 * Upload location reference photos
 * @param {string} locationId
 * @param {Array<{base64: string, mimeType: string}>} photos
 */
export const uploadLocationRefs = async (locationId, photos) => {
    try {
        const res = await fetch(`${API_BASE}/api/location-refs/${encodeURIComponent(locationId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photos }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur upload location refs:', err.message);
        return null;
    }
};

/**
 * Delete a location reference photo
 */
export const deleteLocationRef = async (locationId, refId) => {
    try {
        const res = await fetch(`${API_BASE}/api/location-refs/${encodeURIComponent(locationId)}/${encodeURIComponent(refId)}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Velvet] Erreur delete location ref:', err.message);
        return null;
    }
};

/**
 * Get the image URL for a location reference photo (for <img> display)
 */
export const locationRefImageUrl = (locationId, refId) => `${API_BASE}/api/location-refs/${encodeURIComponent(locationId)}/${encodeURIComponent(refId)}/image`;
