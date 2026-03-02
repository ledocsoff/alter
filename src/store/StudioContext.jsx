import React, { createContext, useContext, useState, useEffect } from "react";
import { DEFAULT_MODEL } from "../constants/modelOptions";
import { DEFAULT_SCENE } from "../constants/sceneOptions";
import { generateNanoBananaPrompt, generateNegativePrompt } from "../utils/promptGenerators";
import { getSavedModels } from "../utils/storage";

const StudioContext = createContext();

export const useStudio = () => useContext(StudioContext);

export const StudioProvider = ({ children }) => {
  // --- ÉTAT GLOBAL (Création Dynamique) ---
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [scene, setScene] = useState(DEFAULT_SCENE);

  // --- NOUVEAUX ÉTATS OFM (Contexte Hiérarchique Geelark) ---
  // On stocke la liste complète de la "Base de données" pour l'afficher partout si besoin
  const [allModelsDatabase, setAllModelsDatabase] = useState([]);
  
  // On stocke quel est le téléphone/compte Actuellement "Chargé" en Mémoire
  const [activeWorkflow, setActiveWorkflow] = useState({
    modelId: null,   // L'ID du personnage actif (Clara)
    phoneId: null,   // L'ID du Fake Phone (Geelark B12)
    accountId: null, // L'ID du compte Social (Instagram @clara.voyage)
  });

  // --- OUTPUTS PROMPTS ---
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  // Au démarrage, on charge la BDD
  useEffect(() => {
    setAllModelsDatabase(getSavedModels());
  }, []);

  // 1. RECALCUL DU PROMPT (Mode Normal OU Mode Restreint)
  useEffect(() => {
    // On extrait les restrictions du "Compte" sélectionné s'il y en a un
    let activeAccount = null;
    if (activeWorkflow.modelId && activeWorkflow.phoneId && activeWorkflow.accountId) {
      const dbModel = allModelsDatabase.find(m => m.id === activeWorkflow.modelId);
      const dbPhone = dbModel?.phones?.find(p => p.id === activeWorkflow.phoneId);
      activeAccount = dbPhone?.accounts?.find(a => a.id === activeWorkflow.accountId);
    }

    // On génère le prompt. S'il y a un compte avec une "vibe" forcée (ex: "Vertical TikTok aesthetic"), 
    // on l'envoie pour overrider la scène normale.
    const prompt = generateNanoBananaPrompt(model, scene, activeAccount);
    
    setGeneratedPrompt(prompt);
    setNegativePrompt(generateNegativePrompt());
  }, [model, scene, activeWorkflow, allModelsDatabase]);


  // 2. HELPERS (Moteur Graphique / Sliders)
  const updateModelCategory = (category, key, value) => {
    setModel(prev => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  const updateSceneEntry = (key, value) => {
    setScene(prev => ({ ...prev, [key]: value }));
  };

  return (
    <StudioContext.Provider value={{
      model, scene, generatedPrompt, negativePrompt,
      setModel, setScene, updateModelCategory, updateSceneEntry,
      
      // NOUVEAU: Les props pour le futur Dashboard Geelark
      allModelsDatabase, 
      setAllModelsDatabase,
      activeWorkflow,
      setActiveWorkflow
    }}>
      {children}
    </StudioContext.Provider>
  );
};
