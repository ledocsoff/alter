import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_MODEL } from "../constants/modelOptions";
import { DEFAULT_SCENE } from "../constants/sceneOptions";
import { generatePromptJSON } from "../utils/promptGenerators";
import { getSavedModels } from "../utils/storage";

// =============================================
// CONTEXT 1 : DATABASE (Modèles, Comptes, Lieux)
// =============================================
const DatabaseContext = createContext();

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider = ({ children }) => {
  const [allModelsDatabase, setAllModelsDatabase] = useState([]);
  const [activeWorkflow, setActiveWorkflow] = useState({
    modelId: null,
    accountId: null,
  });

  useEffect(() => {
    setAllModelsDatabase(getSavedModels());
  }, []);

  const value = useMemo(() => ({
    allModelsDatabase,
    setAllModelsDatabase,
    activeWorkflow,
    setActiveWorkflow,
  }), [allModelsDatabase, activeWorkflow]);

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

// =============================================
// CONTEXT 2 : PROMPT (Modèle physique, Scène, Outputs)
// =============================================
const PromptContext = createContext();

export const usePrompt = () => useContext(PromptContext);

export const PromptProvider = ({ children }) => {
  const { allModelsDatabase, activeWorkflow } = useDatabase();

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [scene, setScene] = useState(DEFAULT_SCENE);

  // Recalcul du prompt JSON (réactif)
  const promptJSON = useMemo(() => {
    let activeAccount = null;
    if (activeWorkflow.modelId && activeWorkflow.accountId) {
      const dbModel = allModelsDatabase.find(m => m.id === activeWorkflow.modelId);
      activeAccount = dbModel?.accounts?.find(a => a.id === activeWorkflow.accountId);
    }
    return generatePromptJSON(model, scene, activeAccount);
  }, [model, scene, activeWorkflow, allModelsDatabase]);

  const generatedPrompt = useMemo(() => JSON.stringify(promptJSON, null, 2), [promptJSON]);

  const updateModelField = useCallback((key, value) => {
    setModel(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateModelCategory = useCallback((category, key, value) => {
    setModel(prev => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  }, []);

  const updateSceneEntry = useCallback((key, value) => {
    setScene(prev => ({ ...prev, [key]: value }));
  }, []);

  const value = useMemo(() => ({
    model, scene, generatedPrompt, promptJSON,
    setModel, setScene, updateModelField, updateModelCategory, updateSceneEntry,
  }), [model, scene, generatedPrompt, promptJSON, updateModelField, updateModelCategory, updateSceneEntry]);

  return (
    <PromptContext.Provider value={value}>
      {children}
    </PromptContext.Provider>
  );
};

// =============================================
// HOOK COMBINÉ (rétrocompatibilité)
// =============================================
export const useStudio = () => {
  const db = useDatabase();
  const prompt = usePrompt();
  return { ...db, ...prompt };
};

// =============================================
// PROVIDER COMBINÉ
// =============================================
export const StudioProvider = ({ children }) => (
  <DatabaseProvider>
    <PromptProvider>
      {children}
    </PromptProvider>
  </DatabaseProvider>
);
