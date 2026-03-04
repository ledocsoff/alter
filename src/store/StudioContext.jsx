import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_MODEL } from "../constants/modelOptions";
import { DEFAULT_SCENE } from "../constants/sceneOptions";
import { generateAnchorMatrix } from "../utils/promptGenerators";
import { getSavedModels } from "../utils/storage";

// =============================================
// CONTEXT 1 : DATABASE (Modèles, Comptes, Lieux)
// =============================================
const DatabaseContext = createContext();

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider = ({ children }) => {
  const [allModelsDatabase, setAllModelsDatabase] = useState(() => getSavedModels());
  const [activeWorkflow, setActiveWorkflow] = useState({
    modelId: null,
    accountId: null,
  });

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
  const [referenceImages, setReferenceImages] = useState([]);

  // Resolve active account
  const activeAccount = useMemo(() => {
    if (!activeWorkflow.modelId || !activeWorkflow.accountId) return null;
    const dbModel = allModelsDatabase.find(m => m.id === activeWorkflow.modelId);
    return dbModel?.accounts?.find(a => a.id === activeWorkflow.accountId) || null;
  }, [activeWorkflow, allModelsDatabase]);

  // Matrice d'ancrage = prompt principal
  const anchorMatrix = useMemo(() => generateAnchorMatrix(model, scene, activeAccount), [model, scene, activeAccount]);
  const generatedPrompt = useMemo(() => JSON.stringify(anchorMatrix, null, 2), [anchorMatrix]);

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
    model, scene, generatedPrompt, anchorMatrix, referenceImages,
    setModel, setScene, setReferenceImages, updateModelField, updateModelCategory, updateSceneEntry,
  }), [model, scene, generatedPrompt, anchorMatrix, referenceImages, updateModelField, updateModelCategory, updateSceneEntry]);

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
