import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_MODEL } from "../constants/modelOptions";
import { DEFAULT_SCENE } from "../constants/sceneOptions";
import { generateAnchorMatrix } from "../utils/promptGenerators";
import { getSavedModels, getApiKey } from "../utils/storage";
import { generateImage } from "../utils/googleAI";

// =============================================
// CONTEXT 1 : DATABASE (Modèles, Comptes, Lieux)
// =============================================
const DatabaseContext = createContext();

const useDatabase = () => useContext(DatabaseContext);

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

const usePrompt = () => useContext(PromptContext);

export const PromptProvider = ({ children }) => {
  const { allModelsDatabase, activeWorkflow } = useDatabase();

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [scene, setScene] = useState(DEFAULT_SCENE);
  const [referenceImages, setReferenceImages] = useState([]);
  const [locationRefImages, setLocationRefImages] = useState([]);

  // =============================================
  // GLOBAL GENERATION STATE
  // =============================================
  const [generationStatus, setGenerationStatus] = useState('idle'); // 'idle' | 'generating' | 'error'
  const [currentImage, setCurrentImage] = useState(null);
  const [generationError, setGenerationError] = useState('');
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [lastGenTime, setLastGenTime] = useState(0);

  // Timer effect tied to generationStatus
  useEffect(() => {
    let timer;
    if (generationStatus === 'generating') {
      const start = Date.now();
      timer = setInterval(() => setGenerationElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    } else {
      setGenerationElapsed(0);
    }
    return () => clearInterval(timer);
  }, [generationStatus]);

  // Resolve active account
  const activeAccount = useMemo(() => {
    if (!activeWorkflow.modelId || !activeWorkflow.accountId) return null;
    const dbModel = (allModelsDatabase || []).find(m => m.id === activeWorkflow.modelId);
    return dbModel?.accounts?.find(a => a.id === activeWorkflow.accountId) || null;
  }, [activeWorkflow, allModelsDatabase]);

  // Matrice d'ancrage = prompt principal (Nano Virtual Mode always ON)
  // Guard: only build when model is actually loaded (not DEFAULT_MODEL with no name)
  const anchorMatrix = useMemo(() => {
    const name = (model.name || '').trim();
    const characterId = name
      ? `MODEL_${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
      : null;  // null = wait for real model to be set
    return generateAnchorMatrix(model, scene, activeAccount, {
      nanoVirtualMode: true,
      globalSeed: scene.seed || null,
      characterId,
    });
  }, [model, scene, activeAccount]);
  const [customPromptOverride, setCustomPromptOverride] = useState(null);

  // Clear override when underlying visual parameters change
  useEffect(() => {
    setCustomPromptOverride(null);
  }, [anchorMatrix]);

  const generatedPrompt = useMemo(() => customPromptOverride || JSON.stringify(anchorMatrix, null, 2), [anchorMatrix, customPromptOverride]);

  const updateSceneEntry = useCallback((key, value) => {
    setScene(prev => ({ ...prev, [key]: value }));
  }, []);

  // Global generate function
  const handleGenerateImage = useCallback(async (customPromptOverride, currentImageRef = null, toast) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API_KEY_MISSING');

    const now = Date.now();
    if (generationStatus === 'generating') { toast?.info('Génération déjà en cours, patientez...'); return null; }
    if (now - lastGenTime < 2000) { toast?.info('Patientez avant de régénérer'); return null; }

    setGenerationStatus('generating');
    setGenerationError('');
    setGenerationElapsed(0);
    setGenerationElapsed(0);
    setLastGenTime(now);

    // Helper syntax: convert JSON to flat string to avoid API 500 errors on massive nested payloads
    const stringifyPrompt = (promptData) => {
      try {
        const obj = typeof promptData === 'string' ? JSON.parse(promptData) : promptData;
        if (!obj || typeof obj !== 'object') return promptData;

        // Flatten core descriptive fields while stripping JSON boilerplate
        const parts = [];
        if (obj.photo_type) parts.push(`Photo type: ${obj.photo_type}`);
        if (obj.subject) {
          const s = obj.subject;
          parts.push(`Subject: ${[s.demographics, s.hair, s.face, s.apparel, s.anatomy, s.skin_details, s.virtual_model_lock].filter(Boolean).join(', ')}`);
        }
        if (obj.pose) parts.push(`Pose: ${[obj.pose.body_position, obj.pose.expression].filter(Boolean).join(', ')}`);
        if (obj.environment) parts.push(`Environment: ${[obj.environment.setting, obj.environment.background_elements, obj.environment.time_of_day].filter(Boolean).join(', ')}`);
        if (obj.camera?.angle) parts.push(`Camera: ${obj.camera.angle}`);
        if (obj.lighting) parts.push(`Lighting: ${[obj.lighting.source, obj.lighting.color_palette].filter(Boolean).join(', ')}`);
        if (obj.vibe) parts.push(`Vibe: ${obj.vibe}`);
        if (obj.style) parts.push(`Style: ${obj.style}`);

        // Advanced Locks & Nano Virtual Mode directives
        if (obj.custom_details) parts.push(`Custom details: ${obj.custom_details}`);
        if (obj.directives) {
          const d = obj.directives;
          parts.push(`DIRECTIVES: ${[d.identity_lock, d.anatomical_fidelity, d.virtual_model_rule, d.spatial_lock, d.aesthetic_signature].filter(Boolean).join(' | ')}`);
        }
        if (obj.virtual_depth_simulation) {
          const v = obj.virtual_depth_simulation;
          parts.push(`DEPTH/VOLUME: ${[v.pose_guidance, v.volume_guidance, v.realism_guidance].filter(Boolean).join(' | ')}`);
        }
        if (obj.negative_prompt) parts.push(`NEGATIVE: ${obj.negative_prompt}`);

        return parts.join('\n\n') || JSON.stringify(obj);
      } catch {
        return promptData; // Fallback to raw string if not JSON
      }
    };

    const rawPrompt = customPromptOverride || generatedPrompt;
    const promptToSend = stringifyPrompt(rawPrompt);
    let anchorHistory = [];

    if (referenceImages.length > 0) {
      anchorHistory.push({
        role: 'user',
        parts: [
          { text: `IDENTITY LOCK — ABSOLUTE PRIORITY:\nThe following photos show the EXACT person you must reproduce in EVERY image.\nIdentity fidelity is MORE important than any other instruction.` },
          ...referenceImages.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
        ],
      });
      anchorHistory.push({
        role: 'model',
        parts: [{ text: 'Identity locked. I have memorized this exact person\'s face, body, skin tone, hair, and proportions.' }],
      });
    }

    if (locationRefImages.length > 0) {
      anchorHistory.push({
        role: 'user',
        parts: [
          { text: `ENVIRONMENT CONTEXT (secondary to identity):\nReproduce this specific location and background. Maintain EXACT identity of the person.` },
          ...locationRefImages.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
        ],
      });
    }

    // If Variation mode, inject the current image
    if (currentImageRef) {
      anchorHistory.push({
        role: 'user',
        parts: [
          { text: "REFERENCE IMAGE:" },
          { inlineData: { mimeType: currentImageRef.mimeType, data: currentImageRef.imageBase64 || currentImageRef.base64 } },
        ]
      });
    }

    try {
      const result = await generateImage(apiKey, promptToSend, '9:16', anchorHistory, { seed: scene?.seed || null });

      if (!result?.imageBase64) {
        throw new Error(result?.error || "L'API a répondu sans image ou format inattendu.");
      }

      const finalImage = {
        dataUrl: result.dataUrl || `data:${result.mimeType || 'image/png'};base64,${result.imageBase64}`,
        prompt: promptToSend,
        imageBase64: result.imageBase64,
        mimeType: result.mimeType || 'image/png',
      };

      setCurrentImage(finalImage);
      setGenerationStatus('idle');
      return finalImage;
    } catch (err) {
      console.error(err);
      let errMsg = err?.message || 'Erreur inattendue';
      if (errMsg.length > 200) errMsg = "Erreur inattendue de l'IA. " + errMsg.substring(0, 100) + "...";
      setGenerationError(errMsg);
      setGenerationStatus('error');
      return null;
    }
  }, [generatedPrompt, generationStatus, lastGenTime, referenceImages, locationRefImages, model.name]);

  const value = useMemo(() => ({
    model, scene, generatedPrompt, anchorMatrix, referenceImages, locationRefImages,
    generationStatus, currentImage, generationElapsed, generationError, customPromptOverride,
    setModel, setScene, setReferenceImages, setLocationRefImages, updateSceneEntry,
    handleGenerateImage, setGenerationStatus, setCurrentImage, setGenerationError, setCustomPromptOverride
  }), [model, scene, generatedPrompt, anchorMatrix, referenceImages, locationRefImages, generationStatus, currentImage, generationElapsed, generationError, updateSceneEntry, handleGenerateImage, customPromptOverride]);

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
