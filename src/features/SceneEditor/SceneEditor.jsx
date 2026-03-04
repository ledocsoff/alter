import React, { useState, useMemo } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';
import { SCENE_OPTIONS, OUTFIT_PRESETS, DEFAULT_SCENE, SCENE_PRESETS } from '../../constants/sceneOptions';
import { getSceneTemplates, saveSceneTemplate, deleteSceneTemplate } from '../../utils/storage';
import { TrashIcon } from '../../components/Icons';
import { pickRandom } from '../../utils/helpers';

/* ─── Stable sub-components (defined outside render to avoid focus loss) ─── */

const Section = ({ id, label, children, isOpen, onToggle }) => (
    <div className="border-b border-white/[0.04] last:border-0">
        <button
            onClick={() => onToggle(id)}
            className="w-full flex items-center justify-between py-2.5 group"
        >
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{label}</span>
            <span className={`text-[9px] text-zinc-600 transition-transform ${isOpen?.[id] ? 'rotate-0' : '-rotate-90'}`}>▼</span>
        </button>
        {isOpen?.[id] && <div className="pb-3">{children}</div>}
    </div>
);

/* ─── Main Component ─── */

const SceneEditor = ({ isSandbox = false }) => {
    const { scene, updateSceneEntry, setScene } = useStudio();
    const toast = useToast();
    const [showTemplates, setShowTemplates] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templates, setTemplates] = useState(() => getSceneTemplates());
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [activePresetId, setActivePresetId] = useState(null);

    /* ─── Detect active preset ─── */
    const detectedPreset = useMemo(() => {
        if (activePresetId) return activePresetId;
        const match = SCENE_PRESETS.find(p =>
            p.scene.camera_angle === scene.camera_angle &&
            p.scene.pose === scene.pose &&
            p.scene.expression === scene.expression &&
            p.scene.vibe === scene.vibe
        );
        return match?.id || null;
    }, [activePresetId, scene.camera_angle, scene.pose, scene.expression, scene.vibe]);

    /* ─── Apply a scene preset ─── */
    const applyPreset = (preset) => {
        setScene(prev => ({
            ...prev,
            ...preset.scene,
            // In location mode: keep ALL location-locked values
            ...(isSandbox ? {} : {
                environment: prev.environment,
                location_meta: prev.location_meta,
                vibe: prev.vibe,
                lighting: prev.lighting,
            }),
            // Always keep these
            outfit: prev.outfit,
            aspect_ratio: prev.aspect_ratio,
            seed: prev.seed,
            custom_negative_prompt: prev.custom_negative_prompt,
            custom_details: prev.custom_details,
        }));
        setActivePresetId(preset.id);
        toast.info(`${preset.label}`);
    };

    /* ─── Randomize ─── */
    const handleRandomize = () => {
        const preset = pickRandom(SCENE_PRESETS);
        const outfit = pickRandom(OUTFIT_PRESETS);
        setScene(prev => ({
            ...prev,
            ...preset.scene,
            outfit,
            ...(isSandbox ? {} : {
                environment: prev.environment,
                location_meta: prev.location_meta,
                vibe: prev.vibe,
                lighting: prev.lighting,
            }),
            aspect_ratio: prev.aspect_ratio,
            seed: prev.seed,
            custom_negative_prompt: prev.custom_negative_prompt,
            custom_details: prev.custom_details,
        }));
        setActivePresetId(preset.id);
        toast.info(`🎲 ${preset.label} + ${outfit.label}`);
    };

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
            ...(isSandbox ? {} : { vibe: prev.vibe, lighting: prev.lighting }),
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

    const toggleSection = (key) => setShowAdvanced(prev => prev === key ? false : key);

    return (
        <div className="bg-[#0e0e10] border border-white/[0.05] rounded-xl p-4 flex flex-col h-full overflow-hidden animate-fade-in">
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
                    <button
                        onClick={handleRandomize}
                        className="text-[11px] font-medium text-violet-400 hover:text-violet-300 hover:bg-violet-500/8 px-2.5 py-1 rounded-lg transition-colors"
                    >
                        🎲 Surprise
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
                <div className="mb-4">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 block">📸 Ambiance</span>
                    <div className="grid grid-cols-2 gap-1.5">
                        {SCENE_PRESETS.map(preset => {
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
                <div className="mb-4 border-t border-white/[0.04] pt-3">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 block">👗 Tenue</span>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                        {OUTFIT_PRESETS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => updateSceneEntry('outfit', item)}
                                className={`text-[11px] py-1.5 px-1 rounded-lg border text-center transition-all ${scene.outfit?.id === item.id
                                    ? 'bg-violet-500/10 border-violet-500/25 text-violet-300 font-semibold'
                                    : 'bg-transparent border-white/[0.04] text-zinc-600 hover:text-zinc-300 hover:border-white/[0.1]'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <input
                        className="velvet-input w-full text-sm"
                        type="text"
                        placeholder="Tenue sur-mesure..."
                        value={scene.outfit?.value || ""}
                        onChange={(e) => updateSceneEntry('outfit', { id: 'custom', label: 'Custom', value: e.target.value, icon: '' })}
                    />
                </div>

                {/* ═══ DÉTAILS LIBRES ═══ */}
                <div className="mb-4 border-t border-white/[0.04] pt-3">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                        ✏️ Détails libres <span className="normal-case font-normal text-zinc-600">personnalise cette photo</span>
                    </span>
                    <textarea
                        value={scene.custom_details || ''}
                        onChange={(e) => updateSceneEntry('custom_details', e.target.value)}
                        placeholder="Ex: cheveux mouillés, lunettes de soleil, tenant un café, regard vers la droite..."
                        rows={2}
                        className="velvet-input w-full text-[12px] resize-none"
                    />
                </div>

                {/* ═══ ZONE 3: OPTIONS AVANCÉES (replié) ═══ */}
                <div className="border-t border-white/[0.04] pt-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between py-2 group"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
                                ⚙️ Options avancées
                            </span>
                            {!showAdvanced && (scene.pose || scene.expression) && (
                                <span className="text-[9px] text-violet-400/50 font-medium px-1.5 py-0.5 rounded bg-violet-500/5">personnalisé</span>
                            )}
                        </div>
                        <span className={`text-[9px] text-zinc-600 transition-transform ${showAdvanced ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                    </button>

                    {showAdvanced && (
                        <div className="pb-3 space-y-4 animate-fade-in">

                            {/* POSE */}
                            <div>
                                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Pose</span>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {SCENE_OPTIONS.pose.map(item => (
                                        <button
                                            key={item.promptEN}
                                            onClick={() => updateSceneEntry('pose', item.promptEN)}
                                            className={`text-[11px] py-1 px-2.5 rounded-full border transition-all ${scene.pose === item.promptEN
                                                ? 'bg-violet-500/10 border-violet-500/25 text-violet-300 font-semibold'
                                                : 'bg-transparent border-white/[0.04] text-zinc-600 hover:text-zinc-300 hover:border-white/[0.1]'
                                                }`}
                                        >
                                            {item.labelFR}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    className="velvet-input w-full text-sm"
                                    type="text"
                                    placeholder="Pose personnalisée..."
                                    value={scene.pose || ""}
                                    onChange={(e) => updateSceneEntry('pose', e.target.value)}
                                />
                            </div>

                            {/* CAMERA + EXPRESSION */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Caméra</span>
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

                            {/* VIBE + LIGHTING (Sandbox only) */}
                            {isSandbox && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Vibe</span>
                                        <select className="velvet-input w-full text-sm" value={scene.vibe || ""} onChange={(e) => updateSceneEntry('vibe', e.target.value)}>
                                            <option value="">Auto</option>
                                            {SCENE_OPTIONS.vibe?.map(v => (
                                                <option key={v.promptEN} value={v.promptEN}>{v.labelFR}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Éclairage</span>
                                        <select className="velvet-input w-full text-sm" value={scene.lighting || ""} onChange={(e) => updateSceneEntry('lighting', e.target.value)}>
                                            <option value="">Auto</option>
                                            {SCENE_OPTIONS.lighting?.map(l => (
                                                <option key={l.promptEN} value={l.promptEN}>{l.labelFR}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* ENVIRONMENT (Sandbox only) */}
                            {isSandbox && (
                                <div>
                                    <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Environnement</span>
                                    <select className="velvet-input w-full text-sm" value={scene.environment || ""} onChange={(e) => updateSceneEntry('environment', e.target.value)}>
                                        {SCENE_OPTIONS.environment.map(env => (
                                            <option key={env.promptEN} value={env.promptEN}>{env.labelFR}</option>
                                        ))}
                                    </select>
                                    <input
                                        className="velvet-input w-full mt-1.5 text-sm"
                                        type="text"
                                        placeholder="...ou décor custom en anglais"
                                        onChange={(e) => { if (e.target.value.trim()) updateSceneEntry('environment', e.target.value); }}
                                    />
                                </div>
                            )}

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
