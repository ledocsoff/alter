const STORAGE_KEY = 'nanabanana_studio_v4';
const HISTORY_KEY = 'nanabanana_history';
const TEMPLATES_KEY = 'nanabanana_templates';
const API_KEY_KEY = 'nanabanana_api_key';

// ============================================
// API KEY
// ============================================
export const getApiKey = () => {
    try { return localStorage.getItem(API_KEY_KEY) || ''; } catch { return ''; }
};

export const saveApiKey = (key) => {
    localStorage.setItem(API_KEY_KEY, key);
};

export const removeApiKey = () => {
    localStorage.removeItem(API_KEY_KEY);
};

// ============================================
// LECTURE GLOBALE
// ============================================
export const getSavedModels = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const parsed = data ? JSON.parse(data) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Erreur de lecture du localStorage :", error);
        return [];
    }
};

const _saveAll = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
export const saveLocationData = (modelId, accountId, locationData) => {
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    const account = model?.accounts.find(a => a.id === accountId);
    if (!account) return null;

    const id = locationData.id || `loc_${crypto.randomUUID()}`;
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
    return history;
};

export const clearPromptHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
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
    return templates;
};

export const deleteSceneTemplate = (templateId) => {
    let templates = getSceneTemplates();
    templates = templates.filter(t => t.id !== templateId);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return templates;
};

// ============================================
// EXPORT / IMPORT
// ============================================
export const exportAllData = () => {
    return JSON.stringify({
        version: 'nanabanana_v4',
        exportedAt: new Date().toISOString(),
        models: getSavedModels(),
        templates: getSceneTemplates(),
        history: getPromptHistory(),
    }, null, 2);
};

export const importAllData = (jsonString) => {
    const data = JSON.parse(jsonString);
    if (!data.version || !data.models) {
        throw new Error('Format invalide');
    }
    _saveAll(data.models);
    if (data.templates) {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(data.templates));
    }
    if (data.history) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history));
    }
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
