import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { DEFAULT_SCENE, SCENE_OPTIONS, OUTFIT_PRESETS } from '../constants/sceneOptions';
import SceneEditor from '../features/SceneEditor/SceneEditor';
import OutputPanel from '../features/OutputPanel/OutputPanel';
import ImagePreview from '../features/ImagePreview/ImagePreview';
import ApiKeyModal from '../features/ApiKeyModal/ApiKeyModal';

const GenerationView = () => {
    const { modelId, accountId, locationId } = useParams();
    const navigate = useNavigate();
    const { allModelsDatabase, model, setModel, scene, setScene, updateSceneEntry, setActiveWorkflow } = useStudio();

    const [isLoaded, setIsLoaded] = useState(false);
    const [showRecap, setShowRecap] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [rightPanel, setRightPanel] = useState('image'); // 'json' | 'image'
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
        } else {
            setActiveWorkflow({ modelId, accountId });
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
        }

        setIsLoaded(true);
        return () => setActiveWorkflow({ modelId: null, accountId: null });
    }, [modelId, accountId, locationId, isSandbox, allModelsDatabase, navigate, setModel, setScene, setActiveWorkflow, updateSceneEntry]);

    // Keyboard shortcuts
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const handleRandomize = useCallback(() => {
        setScene({
            outfit: pickRandom(OUTFIT_PRESETS),
            vibe: pickRandom(SCENE_OPTIONS.vibe).promptEN,
            camera_angle: pickRandom(SCENE_OPTIONS.camera_angle).promptEN,
            pose: pickRandom(SCENE_OPTIONS.pose).promptEN,
            lighting: pickRandom(SCENE_OPTIONS.lighting).promptEN,
            expression: pickRandom(SCENE_OPTIONS.expression).promptEN,
            aspect_ratio: scene.aspect_ratio,
            environment: scene.environment,
            location_meta: scene.location_meta,
        });
    }, [scene, setScene]);

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
                            <button
                                onClick={() => setRightPanel('image')}
                                className={`text-[11px] font-semibold px-3.5 py-1.5 rounded-md transition-all ${
                                    rightPanel === 'image'
                                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Image
                            </button>
                            <button
                                onClick={() => setRightPanel('json')}
                                className={`text-[11px] font-semibold px-3.5 py-1.5 rounded-md transition-all ${
                                    rightPanel === 'json'
                                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                JSON
                            </button>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                            {rightPanel === 'image' && (
                                <span className="text-[10px] text-zinc-700 font-mono">Cmd+G generer</span>
                            )}
                            {rightPanel === 'json' && (
                                <span className="text-[10px] text-zinc-700 font-mono">Cmd+C copier</span>
                            )}
                        </div>
                    </div>
                    {/* ACTIVE PANEL */}
                    <div className="flex-1 min-h-0">
                        {rightPanel === 'json' ? (
                            <OutputPanel meta={meta} />
                        ) : (
                            <ImagePreview
                                ref={imagePreviewRef}
                                onRequestApiKey={() => setShowApiKeyModal(true)}
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
