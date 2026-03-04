import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { DEFAULT_SCENE, SCENE_OPTIONS, OUTFIT_PRESETS } from '../constants/sceneOptions';
import { CONTROLNET_PRESETS } from '../constants/controlnetPresets';
import { saveLocationData, generateSeed, getApiKey, saveLastSession, getModelRefs, loadModelRefBase64 } from '../utils/storage';
import { pickRandom } from '../utils/helpers';
import { generateAnchorMatrixViaGemini } from '../utils/googleAI';
import SceneEditor from '../features/SceneEditor/SceneEditor';
import ImagePreview from '../features/ImagePreview/ImagePreview';
import ReferenceUpload from '../features/ReferenceUpload/ReferenceUpload';
import EditableMatrix from '../features/EditableMatrix/EditableMatrix';
import GalleryPanel from '../features/GalleryPanel/GalleryPanel';
import PromptHistoryPanel from '../features/PromptHistoryPanel/PromptHistoryPanel';
import ApiKeyModal from '../features/ApiKeyModal/ApiKeyModal';
import { SparklesIcon, ImageIcon, CameraIcon, FileTextIcon, SettingsIcon, ZapIcon } from '../components/Icons';

const TABS = [
    { id: 'image', Icon: ImageIcon, label: 'Image' },
    { id: 'galerie', Icon: CameraIcon, label: 'Galerie' },
    { id: 'historique', Icon: FileTextIcon, label: 'Prompts' },
    { id: 'matrice', Icon: SettingsIcon, label: 'Matrice' },
];

const GenerationView = () => {
    const { modelId, accountId, locationId } = useParams();
    const navigate = useNavigate();
    const { allModelsDatabase, model, setModel, scene, setScene, updateSceneEntry, setActiveWorkflow, anchorMatrix, generatedPrompt, setReferenceImages } = useStudio();
    const toast = useToast();

    const [isLoaded, setIsLoaded] = useState(false);
    const [showRecap, setShowRecap] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [rightPanel, setRightPanel] = useState(() => {
        try { return sessionStorage.getItem('velvet_last_tab') || 'image'; } catch { return 'image'; }
    });
    const [enrichedMatrix, setEnrichedMatrix] = useState(null);
    const [isEnriching, setIsEnriching] = useState(false);
    const [galleryKey, setGalleryKey] = useState(0);
    const [historyKey, setHistoryKey] = useState(0);
    const imagePreviewRef = useRef(null);
    const hasInitialized = useRef(false);


    const currentModel = (allModelsDatabase || []).find(m => m.id === modelId);
    const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);
    const currentLocation = currentAccount?.locations?.find(l => l.id === locationId);

    useEffect(() => {
        if (hasInitialized.current) return;

        const mdl = (allModelsDatabase || []).find(m => m.id === modelId);
        const acc = mdl?.accounts?.find(a => a.id === accountId);
        const loc = acc?.locations?.find(l => l.id === locationId);

        if (!mdl || !acc || !loc) {
            navigate('/');
            return;
        }

        hasInitialized.current = true;
        setScene({ ...DEFAULT_SCENE });

        const { id, accounts, ...modelTraits } = mdl;
        setModel({ ...modelTraits, name: mdl.name });

        setActiveWorkflow({ modelId, accountId });
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

        setIsLoaded(true);

        saveLastSession({
            modelId,
            accountId,
            locationId,
            modelName: mdl.name,
            locationName: loc?.name,
            path: `/models/${modelId}/accounts/${accountId}/locations/${locationId}/generate`,
        });
    }, [modelId, accountId, locationId, allModelsDatabase, navigate, setModel, setScene, setActiveWorkflow, updateSceneEntry]);

    // Cleanup workflow on unmount (separate effect so it always runs)
    useEffect(() => {
        return () => setActiveWorkflow({ modelId: null, accountId: null });
    }, [setActiveWorkflow]);

    // Quick Win B: Persist last tab
    useEffect(() => {
        try { sessionStorage.setItem('velvet_last_tab', rightPanel); } catch { }
    }, [rightPanel]);

    // Auto-load persistent model reference photos
    useEffect(() => {
        if (!modelId || !isLoaded) return;
        (async () => {
            try {
                const refs = await getModelRefs(modelId);
                if (!refs || refs.length === 0) return;
                const loaded = (await Promise.all(
                    refs.map(r => loadModelRefBase64(modelId, r.id))
                )).filter(Boolean).map(r => ({ base64: r.base64, mimeType: r.mimeType, dataUrl: `data:${r.mimeType};base64,${r.base64}` }));
                if (loaded.length > 0) {
                    setReferenceImages(loaded);
                }
            } catch { /* silent */ }
        })();
    }, [modelId, isLoaded, setReferenceImages]);


    const handleRandomize = useCallback(() => {
        setScene(prev => ({
            ...prev,
            outfit: pickRandom(OUTFIT_PRESETS),
            controlnet_preset: pickRandom(CONTROLNET_PRESETS).id,
            camera_angle: pickRandom(SCENE_OPTIONS.camera_angle).promptEN,
            pose: pickRandom(SCENE_OPTIONS.pose).promptEN,
            expression: pickRandom(SCENE_OPTIONS.expression).promptEN,
        }));
    }, [setScene]);

    // Lightweight djb2 hash for model fingerprinting
    const modelHash = (() => {
        const str = JSON.stringify(currentModel || {});
        let hash = 5381;
        for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
        return (hash >>> 0).toString(36);
    })();

    const meta = {
        modelName: currentModel?.name || '',
        locationName: currentLocation?.name || '',
        accountHandle: currentAccount?.handle || '',
        scene: scene,
        seed: scene.seed,
        modelHash,
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
                <div className="w-5 h-5 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleRegenerateSeed = () => {
        const newSeed = generateSeed();
        updateSceneEntry('seed', newSeed);
        if (currentLocation) {
            saveLocationData(modelId, accountId, { ...currentLocation, seed: newSeed });
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">

            {/* HEADER BAR */}
            <div className="shrink-0 h-11 px-5 border-b border-white/[0.04] bg-[#0c0c0e] flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500"></div>
                    <span className="text-[13px] font-semibold text-zinc-200 truncate">
                        {currentLocation?.name}
                    </span>
                    <span className="text-[11px] text-zinc-600 shrink-0">
                        {currentModel.name} / {currentAccount?.handle}
                    </span>
                </div>
                <div className="flex items-center gap-2.5">
                    <ReferenceUpload />
                    {/* SEED BADGE */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[10px] text-zinc-500 font-medium">Seed</span>
                        <span className="text-[11px] text-violet-400 font-mono font-semibold tabular-nums">{scene.seed || '—'}</span>
                        <button
                            onClick={handleRegenerateSeed}
                            className="ml-0.5 w-4 h-4 rounded flex items-center justify-center text-[9px] text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                            title="Régénérer la seed"
                        >
                            ↻
                        </button>
                    </div>
                    <button
                        onClick={() => setShowRecap(!showRecap)}
                        className={`text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all ${showRecap ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03]'}`}
                    >
                        Fiche modèle
                    </button>
                    <span className="text-[10px] text-emerald-400/60 font-medium shrink-0 flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                        verrouillé
                    </span>
                </div>
            </div>

            {/* MODEL RECAP */}
            {showRecap && (
                <div className="shrink-0 px-5 py-3 border-b border-white/[0.04] bg-[#0a0a0c] animate-slide-in-down">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                        <div>
                            <span className="text-zinc-600 block mb-0.5">Identité</span>
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
                        <div className="mt-2 pt-2 border-t border-white/[0.04]">
                            <span className="text-zinc-600 text-[10px]">Directives: </span>
                            <span className="text-zinc-500 text-[10px] font-mono">{model.anatomical_fidelity.slice(0, 120)}...</span>
                        </div>
                    )}
                </div>
            )}

            {/* WORKSPACE */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
                <div className="lg:col-span-4 h-full flex flex-col overflow-hidden">
                    <SceneEditor location={currentLocation} />
                </div>
                <div className="lg:col-span-8 h-full flex flex-col overflow-hidden gap-3">
                    {/* PANEL TABS */}
                    <div className="flex items-center shrink-0">
                        <div className="flex items-center bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 gap-0.5">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setRightPanel(tab.id)}
                                    title={tab.label}
                                    className={`text-[12px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${rightPanel === tab.id
                                        ? 'bg-white/[0.06] shadow-sm text-zinc-200 font-medium'
                                        : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'
                                        }`}
                                >
                                    <tab.Icon size={13} />
                                    <span className="hidden md:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                            {rightPanel === 'image' && (
                                <>
                                    <button
                                        onClick={() => {

                                            const getVariant = (i) => {
                                                try {
                                                    const matrix = JSON.parse(generatedPrompt);
                                                    if (i > 0) {
                                                        matrix.pose.body_position = pickRandom(SCENE_OPTIONS.pose).promptEN;
                                                        matrix.camera.perspective = pickRandom(SCENE_OPTIONS.camera_angle).promptEN;
                                                        matrix.mood_and_expression.facial_expression = pickRandom(SCENE_OPTIONS.expression).promptEN;
                                                    }
                                                    return JSON.stringify(matrix, null, 2);
                                                } catch { return generatedPrompt; }
                                            };
                                            imagePreviewRef.current?.handleBatchGenerate(3, getVariant);
                                        }}
                                        className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <SparklesIcon size={11} />
                                        Batch x3
                                    </button>
                                    <span className="text-[10px] text-zinc-700 font-mono">⌘G générer</span>
                                </>
                            )}
                            {rightPanel === 'matrice' && (
                                <span className="text-[10px] text-zinc-700 font-mono">Prompt ultra-précis</span>
                            )}
                        </div>
                    </div>
                    {/* ACTIVE PANEL */}
                    <div className="flex-1 min-h-0">
                        {rightPanel === 'matrice' ? (
                            <div className="h-full flex flex-col bg-[#0a0a0c] border border-white/[0.05] rounded-xl overflow-hidden">
                                <div className="shrink-0 px-4 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
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
                                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
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
                                                    toast.success('Matrice enrichie — génération en cours...');
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
                                            className="velvet-btn-primary text-[10px] font-semibold px-2.5 py-1 disabled:opacity-50"
                                        >
                                            {isEnriching ? '...' : <><ZapIcon size={10} className="inline -mt-px" /> Enrichir &amp; Générer</>}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const data = enrichedMatrix ? JSON.stringify(enrichedMatrix, null, 2) : generatedPrompt;
                                                navigator.clipboard.writeText(data);
                                                toast.success('Matrice copiée');
                                            }}
                                            className="velvet-btn-ghost text-[10px] font-semibold px-2.5 py-1"
                                        >
                                            Copier
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                    <EditableMatrix
                                        matrix={enrichedMatrix || anchorMatrix}
                                        onChange={(path, value) => {
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
                            <div className="h-full bg-[#0a0a0c] border border-white/[0.05] rounded-xl overflow-hidden">
                                <GalleryPanel key={galleryKey} />
                            </div>
                        ) : rightPanel === 'historique' ? (
                            <div className="h-full bg-[#0a0a0c] border border-white/[0.05] rounded-xl overflow-hidden">
                                <PromptHistoryPanel
                                    key={historyKey}
                                    onReuse={(prompt) => imagePreviewRef.current?.handleGenerateWithPrompt(prompt)}
                                />
                            </div>
                        ) : (
                            <ImagePreview
                                ref={imagePreviewRef}
                                onRequestApiKey={() => setShowApiKeyModal(true)}
                                galleryMeta={meta}
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
