import React, { createContext, useContext, useState, useEffect } from "react";
import { DEFAULT_MODEL } from "../constants/modelOptions";
import { DEFAULT_SCENE } from "../constants/sceneOptions";
import { generateNanoBananaPrompt, generateNegativePrompt } from "../utils/promptGenerators";

// Création du Context Global
const StudioContext = createContext();

// Hook personnalisé pour consommer le Store facilement
export const useStudio = () => useContext(StudioContext);

export const StudioProvider = ({ children }) => {
  // 1. État du Modèle (Le Profil de la fille : Corps, Visage...)
  const [model, setModel] = useState(DEFAULT_MODEL);

  // 2. État de la Scène (Vêtements, Poses, Lumières...)
  const [scene, setScene] = useState(DEFAULT_SCENE);

  // 3. Les Outputs générés en temps réel
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  // Recalculer le prompt dès qu'un élément change
  useEffect(() => {
    const prompt = generateNanoBananaPrompt(model, scene);
    setGeneratedPrompt(prompt);
    setNegativePrompt(generateNegativePrompt());
  }, [model, scene]);

  // Fonctions Helpers de mise à jour partielles (pour éviter l'écrasement)
  const updateModelCategory = (category, key, value) => {
    setModel((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const updateSceneEntry = (key, value) => {
    setScene((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Valeurs partagées à toute l'application
  const value = {
    // États bruts
    model,
    scene,
    generatedPrompt,
    negativePrompt,

    // Setters globaux (ex: au chargement d'un vieux profil JSON)
    setModel,
    setScene,

    // Setters fins (pour l'UI Dropdown : updateModelCategory('eyes', 'color', 'blue'))
    updateModelCategory,
    updateSceneEntry,
  };

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
};
