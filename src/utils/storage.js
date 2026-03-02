const STORAGE_KEY = 'nanabanana_studio_v4';

// ============================================
// LECTURE GLOBALE
// ============================================
export const getSavedModels = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        // Si ancien schéma (nanabanana_saved_models) détecté ou Array vide, on force []
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
    // Création ou Mise à jour
    const id = newModel.id || `mod_${Date.now()}`;
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

    const id = accountData.id || `acc_${Date.now()}`;
    const account = {
        ...accountData,
        id,
        locations: accountData.locations || [] // Initialise la liste des lieux
    };

    const index = model.accounts.findIndex(a => a.id === id);
    if (index >= 0) model.accounts[index] = account; // Update
    else model.accounts.push(account); // Create

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

    const id = locationData.id || `loc_${Date.now()}`;
    // Un lieu = Un Nom + Une config par défaut (Environment strict, et Vibe/Light autorisés ou forcés)
    const location = {
        ...locationData,
        id,
        name: locationData.name || "Nouveau Lieu",
        environment: locationData.environment || "", // L'environnement SCENE strictly rataché
        vibe: locationData.vibe || "",
        lighting: locationData.lighting || ""
    };

    const index = account.locations.findIndex(l => l.id === id);
    if (index >= 0) account.locations[index] = location; // Update
    else account.locations.push(location); // Create

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
// NIVEAU 2.5 : ACCOUNTS (RESTRICTIONS)
// ============================================
export const updateAccountRestrictions = (modelId, fakePhoneId, accountId, restrictions) => {
    // Note: fakePhoneId n'est plus utilisé car l'entité Phone a disparu, l'account est branché direct.
    const models = getSavedModels();
    const model = models.find(m => m.id === modelId);
    if (!model) return null;

    const account = model.accounts.find(a => a.id === accountId);
    if (!account) return null;

    // Met à jour les restrictions de la garde-robe / lieux
    if (restrictions.environments) account.allowed_environments = restrictions.environments;
    if (restrictions.outfits) account.allowed_outfits = restrictions.outfits;
    
    _saveAll(models);
    return models;
};
