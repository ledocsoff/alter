import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { DEFAULT_SCENE, SCENE_OPTIONS, OUTFIT_PRESETS } from '../constants/sceneOptions';
import { saveLocationData, generateSeed, getApiKey, saveLastSession } from '../utils/storage';
import { generateAnchorMatrixViaGemini } from '../utils/googleAI';
import SceneEditor from '../features/SceneEditor/SceneEditor';
import ImagePreview from '../features/ImagePreview/ImagePreview';
import ReferenceUpload from '../features/ReferenceUpload/ReferenceUpload';
import EditableMatrix from '../features/EditableMatrix/EditableMatrix';
import GalleryPanel from '../features/GalleryPanel/GalleryPanel';
import PromptHistoryPanel from '../features/PromptHistoryPanel/PromptHistoryPanel';
import ApiKeyModal from '../features/ApiKeyModal/ApiKeyModal';

const GenerationView = () => {
    const { modelId, accountId, locationId } = useParams();
    const navigate = useNavigate();
    const { allModelsDatabase, model, setModel, scene, setScene, updateSceneEntry, setActiveWorkflow, anchorMatrix, generatedPrompt } = useStudio();
    const toast = useToast();

    const [isLoaded, setIsLoaded] = useState(false);
    const [showRecap, setShowRecap] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [rightPanel, setRightPanel] = useState('image'); // 'image' | 'matrice' | 'galerie'
    const [enrichedMatrix, setEnrichedMatrix] = useState(null);
    const [isEnriching, setIsEnriching] = useState(false);
    const [galleryKey, setGalleryKey] = useState(0);
    const [historyKey, setHistoryKey] = useState(0);
    const imagePreviewRef = useRef(null);
    const hasInitialized = useRef(false);

    const isSandbox = locationId === 'sandbox';

    const currentModel = allModelsDatabase.find(m => m.id === modelId);
    const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);
    const currentLocation = isSandbox ? null : currentAccount?.locations?.find(l => l.id === locationId);

    useEffect(() => {
        if (hasInitialized.current) return;

        const mdl = allModelsDatabase.find(m => m.id === modelId);
        const acc = mdl?.accounts?.find(a => a.id === accountId);
        const loc = isSandbox ? null : acc?.locations?.find(l => l.id === locationId);

        if (!mdl || !acc || (!isSandbox && !loc)) {
            navigate('/');
            return;
        }

        hasInitialized.current = true;
        setScene({ ...DEFAULT_SCENE });

        const { id, accounts, ...modelTraits } = mdl;
        setModel({ ...modelTraits, name: mdl.name });

        if (isSandbox) {
            setActiveWorkflow({ modelId: null, accountId: null });
            // Sandbox: seed aléatoire par session
            updateSceneEntry('seed', generateSeed());
        } else {
            setActiveWorkflow({ modelId, accountId });
            // Charger la seed du lieu
            if (loc?.seed) updateSceneEntry('seed', loc.seed);
            if (loc?.environment) updateSceneEntry('environment', loc.environment);
            if (loc?.default_lighting) updateSceneEntry('lighting', loc.default_lighting);
            if (loc?.default_vibe) updateSceneEntry('vibe', loc.default_vibe);
            if (loc?.time_of_day || loc?.anchor_details || loc?.color_palette) {
                updateSceneEntry('location_meta', {
                    time_of_day: loc.time_of_day || '',
                    anchor_details: loc.anchor_details || '',
                    color_palette: loc.color_palette || '',
                });
            }
            if (loc?.negative_prompt) {
                updateSceneEntry('custom_negative_prompt', loc.negative_prompt);
            }
        }

        setIsLoaded(true);

        // Sauvegarder la session pour le bouton "Reprendre"
        saveLastSession({
            modelId,
            accountId,
            locationId,
            modelName: mdl.name,
            locationName: isSandbox ? 'Sandbox' : loc?.name,
            path: `/models/${modelId}/accounts/${accountId}/${isSandbox ? 'sandbox' : `locations/${locationId}/studio`}`,
        });
        return () => setActiveWorkflow({ modelId: null, accountId: null });
    }, [modelId, accountId, locationId, isSandbox, allModelsDatabase, navigate, setModel, setScene, setActiveWorkflow, updateSceneEntry]);

    // Keyboard shortcuts
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const handleRandomize = useCallback(() => {
        setScene(prev => ({
            outfit: pickRandom(OUTFIT_PRESETS),
            vibe: isSandbox ? pickRandom(SCENE_OPTIONS.vibe).promptEN : prev.vibe,
            camera_angle: pickRandom(SCENE_OPTIONS.camera_angle).promptEN,
            pose: pickRandom(SCENE_OPTIONS.pose).promptEN,
            lighting: isSandbox ? pickRandom(SCENE_OPTIONS.lighting).promptEN : prev.lighting,
            expression: pickRandom(SCENE_OPTIONS.expression).promptEN,
            aspect_ratio: prev.aspect_ratio,
            environment: prev.environment,
            location_meta: prev.location_meta,
            seed: prev.seed,
            custom_negative_prompt: prev.custom_negative_prompt,
        }));
    }, [isSandbox, setScene]);

    const galleryMeta = {
        modelName: currentModel?.name || '',
        locationName: isSandbox ? 'Sandbox' : currentLocation?.name || '',
        accountHandle: currentAccount?.handle || '',
        scene: scene,
        seed: scene.seed,
    };

    const handleGenerateImage = useCallback(() => {
        if (imagePreviewRef.current?.handleGenerate) {
            imagePreviewRef.current.handleGenerate();
        }
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
                e.preventDefault();
                handleRandomize();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
                e.preventDefault();
                setRightPanel('image');
                handleGenerateImage();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleRandomize, handleGenerateImage]);

    if (!isLoaded || !currentModel) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const meta = {
        modelName: currentModel.name,
        locationName: isSandbox ? 'Sandbox' : currentLocation?.name || '',
        accountHandle: currentAccount?.handle || '',
    };

    const handleRegenerateSeed = () => {
        const newSeed = generateSeed();
        updateSceneEntry('seed', newSeed);
        // Sauvegarder la nouvelle seed dans le lieu (si ce n'est pas le sandbox)
        if (!isSandbox && currentLocation) {
            saveLocationData(modelId, accountId, { ...currentLocation, seed: newSeed });
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">

            {/* HEADER BAR */}
            <div className="shrink-0 h-10 px-5 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isSandbox ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                    <span className="text-[13px] font-medium text-zinc-300 truncate">
                        {isSandbox ? 'Sandbox' : currentLocation?.name}
                    </span>
                    <span className="text-[11px] text-zinc-600 shrink-0">
                        {currentModel.name} / {currentAccount?.handle}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* REFERENCE IMAGES */}
                    <ReferenceUpload />
                    {/* SEED BADGE */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/60 border border-zinc-700/30">
                        <span className="text-[10px] text-zinc-500 font-medium">Seed</span>
                        <span className="text-[11px] text-amber-400 font-mono font-semibold tabular-nums">{scene.seed || '—'}</span>
                        <button
                            onClick={handleRegenerateSeed}
                            className="ml-0.5 w-4 h-4 rounded flex items-center justify-center text-[9px] text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Regenerer la seed"
                        >
                            ↻
                        </button>
                    </div>
                    <button
                        onClick={() => setShowRecap(!showRecap)}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${showRecap ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        Fiche modele
                    </button>
                    {!isSandbox && (
                        <span className="text-[11px] text-indigo-400/60 font-medium shrink-0">verrouille</span>
                    )}
                </div>
            </div>

            {/* MODEL RECAP */}
            {showRecap && (
                <div className="shrink-0 px-5 py-3 border-b border-zinc-800/50 bg-zinc-950/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                        <div>
                            <span className="text-zinc-600 block mb-0.5">Identite</span>
                            <span className="text-zinc-300">{model.age} ans · {(model.ethnicity || '').split(',')[0]}</span>
                        </div>
                        <div>
                            <span className="text-zinc-600 block mb-0.5">Corps</span>
                            <span className="text-zinc-300">{model.body?.type} · {model.body?.height?.split(',')[0]}</span>
                        </div>
                        <div>
                            <span className="text-zinc-600 block mb-0.5">Visage</span>
                            <span className="text-zinc-300">{model.face?.shape} · {model.eyes?.color}</span>
                        </div>
                        <div>
                            <span className="text-zinc-600 block mb-0.5">Cheveux</span>
                            <span className="text-zinc-300">{(model.hair?.color || '').split(',')[0]} · {(model.hair?.length || '').split(',')[0]}</span>
                        </div>
                    </div>
                    {model.anatomical_fidelity && (
                        <div className="mt-2 pt-2 border-t border-zinc-800/30">
                            <span className="text-zinc-600 text-[10px]">Directives: </span>
                            <span className="text-zinc-500 text-[10px] font-mono">{model.anatomical_fidelity.slice(0, 120)}...</span>
                        </div>
                    )}
                </div>
            )}

            {/* WORKSPACE */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
                <div className="lg:col-span-4 h-full flex flex-col overflow-hidden">
                    <SceneEditor isSandbox={isSandbox} />
                </div>
                <div className="lg:col-span-8 h-full flex flex-col overflow-hidden gap-3">
                    {/* PANEL TABS */}
                    <div className="flex items-center shrink-0">
                        <div className="flex items-center bg-zinc-900/80 border border-zinc-800/50 rounded-lg p-0.5">
                            {[
                                { id: 'image', icon: '🖼️', tip: 'Image' },
                                { id: 'galerie', icon: '📷', tip: 'Galerie' },
                                { id: 'historique', icon: '📝', tip: 'Prompts' },
                                { id: 'matrice', icon: '⚙️', tip: 'Matrice' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setRightPanel(tab.id)}
                                    title={tab.tip}
                                    className={`text-[13px] px-2.5 py-1.5 rounded-md transition-all ${rightPanel === tab.id
                                        ? 'bg-zinc-800 shadow-sm scale-110'
                                        : 'opacity-40 hover:opacity-80'
                                        }`}
                                >
                                    {tab.icon}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                            {rightPanel === 'image' && (
                                <>
                                    <button
                                        onClick={() => {
                                            const pickR = (arr) => arr[Math.floor(Math.random() * arr.length)];
                                            const getVariant = (i) => {
                                                try {
                                                    const matrix = JSON.parse(generatedPrompt);
                                                    if (i > 0) {
                                                        matrix.pose.body_position = pickR(SCENE_OPTIONS.pose).promptEN;
                                                        matrix.camera.perspective = pickR(SCENE_OPTIONS.camera_angle).promptEN;
                                                        matrix.mood_and_expression.facial_expression = pickR(SCENE_OPTIONS.expression).promptEN;
                                                    }
                                                    return JSON.stringify(matrix, null, 2);
                                                } catch { return generatedPrompt; }
                                            };
                                            imagePreviewRef.current?.handleBatchGenerate(3, getVariant);
                                        }}
                                        className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-md transition-colors"
                                    >
                                        ⚡ Batch x3
                                    </button>
                                    <span className="text-[10px] text-zinc-700 font-mono">Cmd+G generer</span>
                                </>
                            )}
                            {rightPanel === 'matrice' && (
                                <span className="text-[10px] text-zinc-700 font-mono">Prompt ultra-precis</span>
                            )}
                        </div>
                    </div>
                    {/* ACTIVE PANEL */}
                    <div className="flex-1 min-h-0">
                        {rightPanel === 'matrice' ? (
                            <div className="h-full flex flex-col bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden">
                                <div className="shrink-0 px-4 py-2.5 border-b border-zinc-800/50 flex items-center justify-between">
                                    <span className="text-[12px] font-semibold text-zinc-300">Matrice d'Ancrage</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={async () => {
                                                const key = getApiKey();
                                                if (!key) { setShowApiKeyModal(true); return; }
                                                setIsEnriching(true);
                                                try {
                                                    const result = await generateAnchorMatrixViaGemini(key, anchorMatrix);
                                                    setEnrichedMatrix(result);
                                                    toast.success('Matrice enrichie par Gemini');
                                                } catch (e) {
                                                    toast.error(e.message);
                                                } finally {
                                                    setIsEnriching(false);
                                                }
                                            }}
                                            disabled={isEnriching}
                                            className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                                        >
                                            {isEnriching ? 'Enrichissement...' : '✨ Enrichir'}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const key = getApiKey();
                                                if (!key) { setShowApiKeyModal(true); return; }
                                                setIsEnriching(true);
                                                try {
                                                    const result = await generateAnchorMatrixViaGemini(key, anchorMatrix);
                                                    setEnrichedMatrix(result);
                                                    toast.success('Matrice enrichie — generation en cours...');
                                                    const enrichedPrompt = JSON.stringify(result, null, 2);
                                                    setRightPanel('image');
                                                    setTimeout(() => {
                                                        imagePreviewRef.current?.handleGenerateWithPrompt(enrichedPrompt);
                                                    }, 100);
                                                } catch (e) {
                                                    toast.error(e.message);
                                                } finally {
                                                    setIsEnriching(false);
                                                }
                                            }}
                                            disabled={isEnriching}
                                            className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 hover:from-amber-500/30 hover:to-orange-500/30 transition-colors disabled:opacity-50"
                                        >
                                            {isEnriching ? '...' : '⚡ Enrichir & Generer'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const data = enrichedMatrix ? JSON.stringify(enrichedMatrix, null, 2) : generatedPrompt;
                                                navigator.clipboard.writeText(data);
                                                toast.success('Matrice copiee');
                                            }}
                                            className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                                        >
                                            Copier
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                    <EditableMatrix
                                        matrix={enrichedMatrix || anchorMatrix}
                                        onChange={(path, value) => {
                                            // Deep set value at path in a copy of the matrix
                                            const base = enrichedMatrix ? { ...enrichedMatrix } : { ...anchorMatrix };
                                            const keys = path.replace('$.', '').split('.');
                                            let obj = base;
                                            for (let i = 0; i < keys.length - 1; i++) {
                                                if (obj[keys[i]] && typeof obj[keys[i]] === 'object') {
                                                    obj[keys[i]] = Array.isArray(obj[keys[i]]) ? [...obj[keys[i]]] : { ...obj[keys[i]] };
                                                    obj = obj[keys[i]];
                                                }
                                            }
                                            obj[keys[keys.length - 1]] = value;
                                            setEnrichedMatrix(base);
                                        }}
                                    />
                                </div>
                            </div>
                        ) : rightPanel === 'galerie' ? (
                            <div className="h-full bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden">
                                <GalleryPanel key={galleryKey} />
                            </div>
                        ) : rightPanel === 'historique' ? (
                            <div className="h-full bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden">
                                <PromptHistoryPanel
                                    key={historyKey}
                                    onReuse={(prompt) => imagePreviewRef.current?.handleGenerateWithPrompt(prompt)}
                                />
                            </div>
                        ) : (
                            <ImagePreview
                                ref={imagePreviewRef}
                                onRequestApiKey={() => setShowApiKeyModal(true)}
                                galleryMeta={galleryMeta}
                                onGalleryUpdate={() => { setGalleryKey(k => k + 1); setHistoryKey(k => k + 1); }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* API KEY MODAL */}
            <ApiKeyModal
                isOpen={showApiKeyModal}
                onClose={() => setShowApiKeyModal(false)}
            />

        </div>
    );
};

export default GenerationView;
