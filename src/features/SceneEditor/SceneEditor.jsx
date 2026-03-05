import React, { useState, useMemo } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';
import { SCENE_OPTIONS, OUTFIT_PRESETS, SCENE_PRESETS, MIRROR_LOCATION_KEYWORDS } from '../../constants/sceneOptions';
import { getSceneTemplates, saveSceneTemplate, deleteSceneTemplate, getApiKey, saveLocationData, getSavedModels } from '../../utils/storage';
import { generateLocationPresets } from '../../utils/googleAI';
import { TrashIcon, SparklesIcon } from '../../components/Icons';

/* ─── Main Component ─── */

const SceneEditor = ({ location = null }) => {
    const { scene, updateSceneEntry, setScene, allModelsDatabase, setAllModelsDatabase, modelId, accountId } = useStudio();
    const toast = useToast();
    const [showTemplates, setShowTemplates] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templates, setTemplates] = useState(() => getSceneTemplates());
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [activePresetId, setActivePresetId] = useState(null);
    const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);

    // Use location-specific presets when available
    const hasAiPresets = location?.ai_presets?.length > 0;
    const presets = hasAiPresets ? location.ai_presets : SCENE_PRESETS;

    /* ─── Detect active preset ─── */
    const detectedPreset = useMemo(() => {
        if (activePresetId) return activePresetId;
        const match = presets.find(p =>
            p.scene.camera_angle === scene.camera_angle &&
            p.scene.pose === scene.pose &&
            p.scene.expression === scene.expression
        );
        return match?.id || null;
    }, [activePresetId, scene.camera_angle, scene.pose, scene.expression, presets]);

    /* ─── Apply a scene preset ─── */
    const PHOTO_TYPE_MAP = {
        selfie: 'selfie taken by the model herself, phone in hand, arm extended or close',
        third_person: 'photo taken by another person, natural framing, no phone visible',
        mirror: 'mirror selfie, full body reflection, phone visible in hand',
    };
    const applyPreset = (preset) => {
        const { outfit: presetOutfit, photo_type: presetPhotoType, ...sceneWithoutOutfit } = preset.scene || {};
        setScene(prev => ({
            ...prev,
            ...sceneWithoutOutfit,
            // In location mode: keep ALL location-locked values
            environment: prev.environment,
            location_meta: prev.location_meta,
            vibe: prev.vibe,
            lighting: prev.lighting,
            // Map photo_type from preset shorthand to full prompt string
            photo_type: presetPhotoType ? (PHOTO_TYPE_MAP[presetPhotoType] || presetPhotoType) : prev.photo_type,
            // Apply outfit from AI preset if present, otherwise keep current
            outfit: presetOutfit
                ? { id: `ai_${preset.id}`, label: preset.label, value: presetOutfit, icon: '' }
                : prev.outfit,
            // Always keep these
            aspect_ratio: prev.aspect_ratio,
            seed: prev.seed,
            custom_negative_prompt: prev.custom_negative_prompt,
            custom_details: prev.custom_details,
        }));
        setActivePresetId(preset.id);
        toast.info(`${preset.label}`);
    };

    /* ─── Generate ALL AI data ─── */
    const handleGenerateAI = async () => {
        const apiKey = getApiKey();
        if (!apiKey) { toast.error('Clé API requise'); return; }
        setIsGeneratingPresets(true);
        try {
            const result = await generateLocationPresets(apiKey, location);
            saveLocationData(modelId, accountId, {
                ...location,
                ai_presets: result.presets,
                ai_outfits: result.outfits,
                ai_poses: result.poses,
            });
            const freshModels = JSON.parse(JSON.stringify(getSavedModels()));
            setAllModelsDatabase(freshModels);
            toast.success(`${result.presets.length} ambiances + ${result.outfits.length} tenues + ${result.poses.length} poses`);
        } catch (err) {
            toast.error(`Erreur: ${err.message}`);
        } finally {
            setIsGeneratingPresets(false);
        }
    };

    /* ─── Collapsible details ─── */
    const [showDetails, setShowDetails] = useState(false);

    /* ─── Templates ─── */
    const handleSaveTemplate = () => {
        if (!templateName.trim()) return;
        const updated = saveSceneTemplate(templateName.trim(), scene);
        setTemplates(updated);
        setTemplateName('');
        toast.success(`Template "${templateName.trim()}" sauvegardé`);
    };

    const handleLoadTemplate = (tpl) => {
        setScene(prev => ({
            ...tpl.scene,
            environment: prev.environment,
            location_meta: prev.location_meta,
            seed: prev.seed,
            custom_negative_prompt: prev.custom_negative_prompt,
            vibe: prev.vibe, lighting: prev.lighting,
        }));
        setShowTemplates(false);
        setActivePresetId(null);
        toast.info(`Template "${tpl.name}" chargé`);
    };

    const handleDeleteTemplate = (e, id) => {
        e.stopPropagation();
        const updated = deleteSceneTemplate(id);
        setTemplates(updated);
    };



    return (
        <div className="bg-[#0e0e10] border border-white/[0.05] rounded-xl p-4 flex flex-col flex-1 min-h-0 overflow-hidden animate-fade-in">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-sm font-semibold text-zinc-200">Scène</h3>
                <div className="flex gap-1">
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all ${showTemplates ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]'}`}
                    >
                        Mes templates
                    </button>

                </div>
            </div>

            {/* TEMPLATES PANEL */}
            {showTemplates && (
                <div className="mb-3 p-3 bg-[#0a0a0c] border border-white/[0.05] rounded-xl shrink-0 animate-fade-in-up">
                    <div className="flex gap-1.5 mb-2">
                        <input
                            type="text"
                            placeholder="Nom du template..."
                            className="velvet-input flex-1 text-[12px] px-2.5 py-1.5"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                        />
                        <button
                            onClick={handleSaveTemplate}
                            disabled={!templateName.trim()}
                            className="velvet-btn-primary text-[11px] py-1.5 px-3 disabled:opacity-20 shrink-0"
                        >
                            Sauver
                        </button>
                    </div>
                    {templates.length === 0 ? (
                        <p className="text-[11px] text-zinc-600 py-2">Aucun template. Configurez une scène puis sauvegardez-la.</p>
                    ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {templates.map(tpl => (
                                <div
                                    key={tpl.id}
                                    onClick={() => handleLoadTemplate(tpl)}
                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] cursor-pointer group transition-colors"
                                >
                                    <div>
                                        <span className="text-[12px] text-zinc-300 font-medium">{tpl.name}</span>
                                        <span className="text-[10px] text-zinc-600 ml-2">{tpl.scene.outfit?.label || ''}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteTemplate(e, tpl.id)}
                                        className="velvet-btn-delete opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TrashIcon size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* FORMAT — always visible */}
            <div className="shrink-0 mb-3">
                <div className="flex gap-1.5">
                    {SCENE_OPTIONS.aspect_ratio.map(ratio => (
                        <button
                            key={ratio.promptEN}
                            onClick={() => updateSceneEntry('aspect_ratio', ratio.promptEN)}
                            className={`flex-1 text-[12px] py-2 rounded-lg border transition-all font-medium ${scene.aspect_ratio === ratio.promptEN
                                ? 'bg-violet-500/10 border-violet-500/25 text-violet-300'
                                : 'bg-transparent border-white/[0.05] text-zinc-600 hover:text-zinc-300 hover:border-white/[0.1]'
                                }`}
                        >
                            {ratio.labelFR}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">

                {/* ═══ ZONE 1: AMBIANCE PRESETS ═══ */}
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                            {hasAiPresets ? `🧠 Ambiances` : '📸 Ambiance'}
                        </span>
                        {hasAiPresets && (
                            <span className="text-[8px] text-emerald-400/60 font-medium px-1 py-0.5 rounded bg-emerald-500/5">IA · {location.name}</span>
                        )}
                    </div>
                    {location && !hasAiPresets && (
                        <div className="mb-2 p-3 rounded-lg border border-dashed border-violet-500/15 bg-violet-500/[0.02] flex items-center justify-between">
                            <p className="text-[11px] text-zinc-500">Aucune ambiance IA</p>
                            <button
                                onClick={handleGenerateAI}
                                disabled={isGeneratingPresets}
                                className={`text-[11px] velvet-btn-primary py-1.5 px-3 flex items-center gap-1.5 ${isGeneratingPresets ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isGeneratingPresets ? (
                                    <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Génération...</>
                                ) : (
                                    <><SparklesIcon size={12} /> Générer tout avec l'IA</>
                                )}
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-1.5">
                        {presets.map(preset => {
                            const isActive = detectedPreset === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => applyPreset(preset)}
                                    className={`relative text-left px-3 py-2.5 rounded-xl border transition-all ${isActive
                                        ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5'
                                        : 'bg-white/[0.015] border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[13px]">{preset.label.split(' ')[0]}</span>
                                        <span className={`text-[12px] font-semibold truncate ${isActive ? 'text-violet-300' : 'text-zinc-300'}`}>
                                            {preset.label.split(' ').slice(1).join(' ')}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-violet-400/60' : 'text-zinc-600'}`}>
                                        {preset.desc}
                                    </p>
                                    {isActive && (
                                        <div className="absolute top-1.5 right-2 text-[9px] text-violet-400 font-bold">✓</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ═══ ZONE 2: TENUE ═══ */}
                <div className="mb-3 border-t border-white/[0.04] pt-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">👗 Tenues</span>
                        {location?.ai_outfits?.length > 0 && (
                            <span className="text-[8px] text-emerald-400/60 font-medium px-1 py-0.5 rounded bg-emerald-500/5">IA · {location.name}</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                        {(location?.ai_outfits?.length > 0 ? location.ai_outfits : OUTFIT_PRESETS).map(item => {
                            const isActive = scene.outfit?.id === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => updateSceneEntry('outfit', item)}
                                    className={`relative text-left px-3 py-2.5 rounded-xl border transition-all ${isActive
                                        ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5'
                                        : 'bg-white/[0.015] border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[13px]">{item.icon || '👗'}</span>
                                        <span className={`text-[12px] font-semibold truncate ${isActive ? 'text-violet-300' : 'text-zinc-300'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-violet-400/60' : 'text-zinc-600'}`}>
                                        {item.value?.slice(0, 40) || ''}{item.value?.length > 40 ? '…' : ''}
                                    </p>
                                    {isActive && (
                                        <div className="absolute top-1.5 right-2 text-[9px] text-violet-400 font-bold">✓</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        className="velvet-input w-full text-sm"
                        type="text"
                        placeholder="Tenue sur-mesure..."
                        value={scene.outfit?.value || ""}
                        onChange={(e) => updateSceneEntry('outfit', { id: 'custom', label: 'Custom', value: e.target.value, icon: '' })}
                    />
                </div>

                {/* ═══ ZONE 3: POSE ═══ */}
                <div className="mb-3 border-t border-white/[0.04] pt-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">🤸 Poses</span>
                        {location?.ai_poses?.length > 0 && (
                            <span className="text-[8px] text-emerald-400/60 font-medium px-1 py-0.5 rounded bg-emerald-500/5">IA · {location.name}</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                        {(location?.ai_poses?.length > 0 ? location.ai_poses : SCENE_OPTIONS.pose).map(item => {
                            const isActive = scene.pose === item.promptEN;
                            return (
                                <button
                                    key={item.promptEN}
                                    onClick={() => updateSceneEntry('pose', item.promptEN)}
                                    className={`relative text-left px-3 py-2.5 rounded-xl border transition-all ${isActive
                                        ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5'
                                        : 'bg-white/[0.015] border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[13px]">🤸</span>
                                        <span className={`text-[12px] font-semibold truncate ${isActive ? 'text-violet-300' : 'text-zinc-300'}`}>
                                            {item.labelFR}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-violet-400/60' : 'text-zinc-600'}`}>
                                        {item.promptEN}
                                    </p>
                                    {isActive && (
                                        <div className="absolute top-1.5 right-2 text-[9px] text-violet-400 font-bold">✓</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        className="velvet-input w-full text-sm"
                        type="text"
                        placeholder="Pose personnalisée..."
                        value={scene.pose || ""}
                        onChange={(e) => updateSceneEntry('pose', e.target.value)}
                    />
                </div>

                {/* ═══ DÉTAILS LIBRES (collapsible chip) ═══ */}
                <div className="mb-3 border-t border-white/[0.04] pt-2">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="w-full flex items-center justify-between py-1.5 group"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
                                ✏️ Détails libres
                            </span>
                            {!showDetails && scene.custom_details && (
                                <span className="text-[9px] text-violet-400/50 font-medium px-1.5 py-0.5 rounded bg-violet-500/5 truncate max-w-[120px]">
                                    {scene.custom_details.slice(0, 25)}{scene.custom_details.length > 25 ? '…' : ''}
                                </span>
                            )}
                        </div>
                        <span className={`text-[9px] text-zinc-600 transition-transform ${showDetails ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                    </button>
                    {showDetails && (
                        <textarea
                            value={scene.custom_details || ''}
                            onChange={(e) => updateSceneEntry('custom_details', e.target.value)}
                            placeholder="Ex: cheveux mouillés, lunettes de soleil, tenant un café, regard vers la droite..."
                            rows={2}
                            className="velvet-input w-full text-[12px] resize-none mt-1 animate-fade-in"
                            autoFocus
                        />
                    )}
                </div>

                {/* ═══ OPTIONS AVANCÉES (collapsed) ═══ */}
                <div className="border-t border-white/[0.04] pt-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between py-1.5 group"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
                                ⚙️ Options avancées
                            </span>
                            {!showAdvanced && scene.expression && (
                                <span className="text-[9px] text-violet-400/50 font-medium px-1.5 py-0.5 rounded bg-violet-500/5">personnalisé</span>
                            )}
                        </div>
                        <span className={`text-[9px] text-zinc-600 transition-transform ${showAdvanced ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                    </button>
                    {showAdvanced && (
                        <div className="pb-3 space-y-3 animate-fade-in">
                            {/* PHOTO TYPE */}
                            <div>
                                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Qui prend la photo ?</span>
                                <div className="flex gap-1">
                                    {SCENE_OPTIONS.photo_type?.map(pt => {
                                        // Hide mirror option if location doesn't have a mirror
                                        const isMirrorOption = pt.promptEN.includes('mirror');
                                        const envLower = (scene.environment || '').toLowerCase();
                                        const hasMirror = MIRROR_LOCATION_KEYWORDS.some(kw => envLower.includes(kw));
                                        if (isMirrorOption && !hasMirror) return null;
                                        const isActive = scene.photo_type === pt.promptEN;
                                        return (
                                            <button
                                                key={pt.promptEN}
                                                onClick={() => updateSceneEntry('photo_type', pt.promptEN)}
                                                className={`flex-1 text-[11px] font-medium py-2 px-2 rounded-lg transition-all ${isActive
                                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                                                    : 'text-zinc-500 border border-zinc-800/60 hover:text-zinc-300 hover:border-zinc-700'
                                                    }`}
                                            >
                                                {pt.labelFR}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* CAMERA + EXPRESSION */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Angle</span>
                                    <select className="velvet-input w-full text-sm" value={scene.camera_angle || ""} onChange={(e) => updateSceneEntry('camera_angle', e.target.value)}>
                                        <option value="">Auto</option>
                                        {SCENE_OPTIONS.camera_angle?.map(shot => (
                                            <option key={shot.promptEN} value={shot.promptEN}>{shot.labelFR}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Expression</span>
                                    <select className="velvet-input w-full text-sm" value={scene.expression || ""} onChange={(e) => updateSceneEntry('expression', e.target.value)}>
                                        <option value="">Auto</option>
                                        {SCENE_OPTIONS.expression?.map(eff => (
                                            <option key={eff.promptEN} value={eff.promptEN}>{eff.labelFR}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {/* NEGATIVE PROMPT */}
                            <div>
                                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Éléments à éviter</span>
                                <textarea
                                    value={scene.custom_negative_prompt || ''}
                                    onChange={(e) => updateSceneEntry('custom_negative_prompt', e.target.value)}
                                    placeholder="tattoo, piercing, neon lights..."
                                    rows={2}
                                    className="velvet-input w-full text-[11px] font-mono resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default SceneEditor;
