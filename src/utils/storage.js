const STORAGE_KEY = 'nanabanana_saved_models';

export const getSavedModels = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Erreur de lecture du localStorage :", error);
    return [];
  }
};

export const saveModelData = (newModel) => {
  try {
    const models = getSavedModels();
    // Générer un ID unique basé sur le timestamp
    const modelWithId = { ...newModel, id: newModel.id || Date.now().toString() };
    
    // Si l'ID existe déjà (mise à jour), on le remplace, sinon on l'ajoute
    const existingIndex = models.findIndex(m => m.id === modelWithId.id);
    if (existingIndex >= 0) {
      models[existingIndex] = modelWithId;
    } else {
      models.push(modelWithId);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
    return models;
  } catch (error) {
    console.error("Erreur de sauvegarde dans le localStorage :", error);
    return null;
  }
};

export const deleteModelData = (id) => {
  try {
    const models = getSavedModels();
    const updatedModels = models.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedModels));
    return updatedModels;
  } catch (error) {
    console.error("Erreur de suppression dans le localStorage :", error);
    return null;
  }
};
