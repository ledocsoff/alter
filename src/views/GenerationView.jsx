import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { DEFAULT_SCENE } from '../constants/sceneOptions';
import { getApiKey, saveLastSession, getModelRefs, loadModelRefBase64, getLocationRefs, loadLocationRefBase64 } from '../utils/storage';
import AIChatPanel from '../features/AIChatPanel/AIChatPanel';
import ImagePreview from '../features/ImagePreview/ImagePreview';
import ReferenceUpload from '../features/ReferenceUpload/ReferenceUpload';
import OutfitRefUpload from '../features/OutfitRefUpload/OutfitRefUpload';
import GalleryPanel from '../features/GalleryPanel/GalleryPanel';
import PromptHistoryPanel from '../features/PromptHistoryPanel/PromptHistoryPanel';
import ApiKeyModal from '../features/ApiKeyModal/ApiKeyModal';
import { ImageIcon, CameraIcon, FileTextIcon } from '../components/Icons';


const TABS = [
    { id: 'image', Icon: ImageIcon, label: 'Image' },
    { id: 'galerie', Icon: CameraIcon, label: 'Galerie' },
    { id: 'historique', Icon: FileTextIcon, label: 'Prompts' },
];

const GenerationView = () => {
    const { modelId, accountId, locationId } = useParams();

    const navigate = useNavigate();
    const { allModelsDatabase, model, setModel, scene, setScene, updateSceneEntry, setActiveWorkflow, generatedPrompt, setReferenceImages, setLocationRefImages, referenceImages, locationRefImages, generationStatus, setCustomPromptOverride } = useStudio();
    const toast = useToast();

    const [isLoaded, setIsLoaded] = useState(false);
    const [showRecap, setShowRecap] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [rightPanel, setRightPanel] = useState(() => {
        try { return sessionStorage.getItem('alter_last_tab') || 'image'; } catch { return 'image'; }
    });
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
        try { sessionStorage.setItem('alter_last_tab', rightPanel); } catch { }
    }, [rightPanel]);

    // Auto-load persistent model reference photos
    useEffect(() => {
        if (!modelId || !isLoaded) return;
        let active = true;
        (async () => {
            try {
                const refs = await getModelRefs(modelId);
                if (!refs || refs.length === 0 || !active) return;
                const loaded = (await Promise.all(
                    refs.map(r => loadModelRefBase64(modelId, r.id))
                )).filter(Boolean).map(r => ({ base64: r.base64, mimeType: r.mimeType, dataUrl: `data:${r.mimeType};base64,${r.base64}` }));
                if (loaded.length > 0 && active) {
                    setReferenceImages(loaded);
                }
            } catch { /* silent */ }
        })();
        return () => { active = false; };
    }, [modelId, isLoaded, setReferenceImages]);

    // Auto-load persistent location reference photos
    useEffect(() => {
        if (!locationId || !isLoaded) { setLocationRefImages([]); return; }
        let active = true;
        (async () => {
            try {
                const refs = await getLocationRefs(locationId);
                if (!refs || refs.length === 0 || !active) { setLocationRefImages([]); return; }
                const loaded = (await Promise.all(
                    refs.map(r => loadLocationRefBase64(locationId, r.id))
                )).filter(Boolean).map(r => ({ base64: r.base64, mimeType: r.mimeType, dataUrl: `data:${r.mimeType};base64,${r.base64}` }));
                if (active) setLocationRefImages(loaded);
            } catch { if (active) setLocationRefImages([]); }
        })();
        return () => { active = false; };
    }, [locationId, isLoaded, setLocationRefImages]);


    // Lightweight djb2 hash for model fingerprinting (Memoized to prevent JSON.stringify on every render)
    const modelHash = useMemo(() => {
        const str = JSON.stringify(currentModel || {});
        let hash = 5381;
        for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
        return (hash >>> 0).toString(36);
    }, [currentModel]);

    const meta = {
        modelName: currentModel?.name || '',
        locationName: currentLocation?.name || '',
        accountHandle: currentAccount?.handle || '',
        scene: scene,
        seed: scene.seed,
        modelHash,
    };

    const handleGenerateImage = useCallback((customPrompt) => {
        if (customPrompt && typeof customPrompt === 'string') {
            imagePreviewRef.current?.handleGenerateWithPrompt(customPrompt);
        } else {
            imagePreviewRef.current?.handleGenerate();
        }
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
                e.preventDefault();
                setRightPanel('image');
                handleGenerateImage();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleGenerateImage]);

    if (!isLoaded || !currentModel) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-teal-500/40 border-t-teal-500 rounded-full animate-spin"></div>
            </div>
        );
    }



    return (
        <div className="flex-1 flex flex-col overflow-hidden">

            {/* HEADER BAR */}
            <div className="shrink-0 min-h-11 h-auto py-2 px-3 sm:px-5 border-b border-white/[0.04] bg-[#0c0c0e] flex flex-wrap items-center justify-between gap-y-2 animate-fade-in">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[50%] sm:max-w-none">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500"></div>
                    <span className="text-[12px] sm:text-[13px] font-semibold text-zinc-200 truncate">
                        {currentLocation?.name}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-zinc-600 shrink-0 truncate max-w-[80px] sm:max-w-none">
                        {currentModel.name}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* MODEL REFS — small thumbnails */}
                    <div className="hidden sm:block">
                        <ReferenceUpload />
                    </div>

                    {/* OUTFIT REFS */}
                    <div className="hidden sm:block">
                        <OutfitRefUpload />
                    </div>

                    {/* LOCATION REFS — tiny thumbnails */}
                    {locationRefImages.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                            <span className="text-[9px] text-emerald-500/70 font-medium">📍</span>
                            {locationRefImages.map((img, i) => (
                                <img
                                    key={i}
                                    src={img.dataUrl}
                                    alt={`Lieu ${i + 1}`}
                                    className="w-6 h-6 rounded object-cover border border-emerald-500/20"
                                />
                            ))}
                        </div>
                    )}

                    {/* DIVIDER */}
                    <div className="hidden sm:block w-px h-5 bg-white/[0.06]" />

                    {/* SEED BADGE */}
                    <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[9px] sm:text-[10px] text-zinc-500 font-medium">Seed</span>
                        <span className="text-[10px] sm:text-[11px] text-teal-400 font-mono font-semibold tabular-nums">{scene.seed || '—'}</span>
                    </div>
                    <button
                        onClick={() => setShowRecap(!showRecap)}
                        className={`text-[9px] sm:text-[10px] font-medium px-2 py-1 sm:px-2.5 rounded-lg transition-all ${showRecap ? 'text-teal-400 bg-teal-500/10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03]'}`}
                    >
                        Fiche modèle
                    </button>
                    <span className="hidden sm:flex text-[10px] text-emerald-400/60 font-medium shrink-0 items-center gap-1">
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
            <div className="generation-workspace flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 min-h-0 overflow-hidden">
                <div className="lg:col-span-4 h-full min-h-0 relative">
                    <div className="absolute inset-0">
                        <AIChatPanel
                            model={model}
                            location={currentLocation}
                            onGenerate={(prompt) => {
                                setCustomPromptOverride(prompt);
                                setRightPanel('image');
                                setTimeout(() => {
                                    handleGenerateImage(prompt);
                                }, 100);
                            }}
                            onShowApiKeyModal={() => setShowApiKeyModal(true)}
                        />
                    </div>
                </div>
                <div className="lg:col-span-8 h-full flex flex-col overflow-hidden gap-3">
                    {/* PANEL TABS */}
                    <div className="flex flex-wrap items-center justify-between gap-y-2 shrink-0">
                        <div className="flex items-center bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 gap-0.5 max-w-full overflow-x-auto custom-scrollbar">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setRightPanel(tab.id)}
                                    title={tab.label}
                                    className={`text-[12px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${rightPanel === tab.id
                                        ? 'bg-white/[0.06] shadow-sm text-zinc-200 font-medium'
                                        : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'
                                        }`}
                                >
                                    <tab.Icon size={13} />
                                    <span className="hidden md:inline">{tab.label}</span>
                                    {tab.id === 'image' && generationStatus === 'generating' && (
                                        <div className="w-2.5 h-2.5 ml-1 border-2 border-teal-400/40 border-t-teal-400 rounded-full animate-spin shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            {rightPanel === 'image' && (
                                <span className="hidden sm:inline text-[10px] text-zinc-700 font-mono">⌘G générer</span>
                            )}
                        </div>
                    </div>

                    {/* ACTIVE PANEL */}
                    <div className="flex-1 min-h-0 relative">
                        <div className="absolute inset-0">
                            {rightPanel === 'galerie' ? (
                                <div className="h-full bg-[#0a0a0c] border border-white/[0.05] rounded-xl overflow-hidden">
                                    <GalleryPanel key={galleryKey} />
                                </div>
                            ) : rightPanel === 'historique' ? (
                                <div className="h-full bg-[#0a0a0c] border border-white/[0.05] rounded-xl overflow-hidden">
                                    <PromptHistoryPanel
                                        key={historyKey}
                                        generatedPrompt={generatedPrompt}
                                        onReuse={(prompt) => {
                                            setCustomPromptOverride(prompt);
                                            setRightPanel('image');
                                            setTimeout(() => {
                                                imagePreviewRef.current?.handleGenerateWithPrompt(prompt);
                                            }, 100);
                                        }}
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
            </div>

            {/* API KEY MODAL */}
            <ApiKeyModal
                isOpen={showApiKeyModal}
                onClose={() => setShowApiKeyModal(false)}
            />

        </div >
    );
};

export default GenerationView;
