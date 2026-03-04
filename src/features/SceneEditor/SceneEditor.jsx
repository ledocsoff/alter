import React, { useState } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';
import { SCENE_OPTIONS, OUTFIT_PRESETS, DEFAULT_SCENE, SCENE_PRESETS } from '../../constants/sceneOptions';
import { getSceneTemplates, saveSceneTemplate, deleteSceneTemplate } from '../../utils/storage';

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const selectClass = "w-full bg-zinc-950 border border-zinc-800/60 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-600 transition-colors";
const labelClass = "text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block";

const SceneEditor = ({ isSandbox = false }) => {
    const { scene, updateSceneEntry, setScene } = useStudio();
    const toast = useToast();
    const [showTemplates, setShowTemplates] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templates, setTemplates] = useState(() => getSceneTemplates());
    const [openSections, setOpenSections] = useState({ outfit: true, pose: true });

    const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

    const Section = ({ id, label, badge, children }) => (
        <div className="border-b border-zinc-800/30 last:border-0">
            <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center justify-between py-2 group"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{label}</span>
                    {badge && <span className="text-[9px] text-indigo-400/50 font-medium px-1.5 py-0.5 rounded bg-indigo-500/5">{badge}</span>}
                </div>
                <span className={`text-[9px] text-zinc-600 transition-transform ${openSections[id] ? 'rotate-0' : '-rotate-90'}`}>▼</span>
            </button>
            {openSections[id] && <div className="pb-3">{children}</div>}
        </div>
    );

    const handleRandomize = () => {
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
    };

    const handleSaveTemplate = () => {
        if (!templateName.trim()) return;
        const updated = saveSceneTemplate(templateName.trim(), scene);
        setTemplates(updated);
        setTemplateName('');
        toast.success(`Template "${templateName.trim()}" sauvegarde`);
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
        toast.info(`Template "${tpl.name}" charge`);
    };

    const handleDeleteTemplate = (e, id) => {
        e.stopPropagation();
        const updated = deleteSceneTemplate(id);
        setTemplates(updated);
    };

    return (
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex flex-col h-full overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-sm font-semibold text-zinc-200">Scene</h3>
                <div className="flex gap-1">
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${showTemplates ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={handleRandomize}
                        className="text-[11px] font-medium text-amber-500 hover:text-amber-400 hover:bg-amber-500/8 px-2.5 py-1 rounded-md transition-colors"
                    >
                        Surprise
                    </button>
                    <button
                        onClick={() => setScene(prev => ({
                            ...DEFAULT_SCENE,
                            environment: prev.environment,
                            location_meta: prev.location_meta,
                            seed: prev.seed,
                            custom_negative_prompt: prev.custom_negative_prompt,
                            ...(isSandbox ? {} : { vibe: prev.vibe, lighting: prev.lighting }),
                        }))}
                        className="text-[11px] font-medium text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 px-2.5 py-1 rounded-md transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* TEMPLATES PANEL */}
            {showTemplates && (
                <div className="mb-3 p-3 bg-zinc-950/80 border border-zinc-800/60 rounded-lg shrink-0">
                    <div className="flex gap-1.5 mb-2">
                        <input
                            type="text"
                            placeholder="Nom du template..."
                            className="flex-1 bg-zinc-900 border border-zinc-800/60 text-zinc-300 text-[12px] rounded-md px-2.5 py-1.5 outline-none focus:border-zinc-600"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                        />
                        <button
                            onClick={handleSaveTemplate}
                            disabled={!templateName.trim()}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-20 transition-colors shrink-0"
                        >
                            Sauver
                        </button>
                    </div>
                    {templates.length === 0 ? (
                        <p className="text-[11px] text-zinc-600 py-2">Aucun template. Configurez une scene puis sauvegardez-la.</p>
                    ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {templates.map(tpl => (
                                <div
                                    key={tpl.id}
                                    onClick={() => handleLoadTemplate(tpl)}
                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800/50 cursor-pointer group transition-colors"
                                >
                                    <div>
                                        <span className="text-[12px] text-zinc-300 font-medium">{tpl.name}</span>
                                        <span className="text-[10px] text-zinc-600 ml-2">{tpl.scene.outfit?.label || ''}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteTemplate(e, tpl.id)}
                                        className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs transition-all"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SCENE PRESETS — Sandbox uniquement */}
            {isSandbox && (
                <div className="shrink-0 mb-3">
                    <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                        {SCENE_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => {
                                    setScene(prev => ({
                                        ...prev,
                                        ...preset.scene,
                                        seed: prev.seed,
                                        custom_negative_prompt: prev.custom_negative_prompt,
                                        location_meta: prev.location_meta,
                                    }));
                                    toast.info(`Scene "${preset.label}" appliquee`);
                                }}
                                className="text-[10px] font-medium px-2.5 py-1.5 rounded-md bg-zinc-900/80 border border-zinc-800/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all whitespace-nowrap shrink-0"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* FORMAT — always visible */}
            <div className="shrink-0 mb-2">
                <div className="flex gap-1.5">
                    {SCENE_OPTIONS.aspect_ratio.map(ratio => (
                        <button
                            key={ratio.promptEN}
                            onClick={() => updateSceneEntry('aspect_ratio', ratio.promptEN)}
                            className={`flex-1 text-[12px] py-2 rounded-lg border transition-all font-medium ${scene.aspect_ratio === ratio.promptEN
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                : 'bg-transparent border-zinc-800/60 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700'
                                }`}
                        >
                            {ratio.labelFR}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">

                {/* TENUE */}
                <Section id="outfit" label="Tenue">
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                        {OUTFIT_PRESETS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => updateSceneEntry('outfit', item)}
                                className={`text-[11px] py-1.5 px-1 rounded-lg border text-center transition-all ${scene.outfit?.id === item.id
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-semibold'
                                    : 'bg-transparent border-zinc-800/40 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <input
                        className="w-full bg-zinc-950 border border-zinc-800/40 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700"
                        type="text"
                        placeholder="Tenue sur-mesure..."
                        value={scene.outfit?.value || ""}
                        onChange={(e) => updateSceneEntry('outfit', { id: 'custom', label: 'Custom', value: e.target.value, icon: '' })}
                    />
                </Section>

                {/* POSE */}
                <Section id="pose" label="Pose">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {SCENE_OPTIONS.pose.map(item => (
                            <button
                                key={item.promptEN}
                                onClick={() => updateSceneEntry('pose', item.promptEN)}
                                className={`text-[11px] py-1 px-2.5 rounded-full border transition-all ${scene.pose === item.promptEN
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-semibold'
                                    : 'bg-transparent border-zinc-800/40 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700'
                                    }`}
                            >
                                {item.labelFR}
                            </button>
                        ))}
                    </div>
                    <input
                        className="w-full bg-zinc-950 border border-zinc-800/40 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700"
                        type="text"
                        placeholder="Pose personnalisee..."
                        value={scene.pose || ""}
                        onChange={(e) => updateSceneEntry('pose', e.target.value)}
                    />
                </Section>

                {/* CAMERA + EXPRESSION */}
                <Section id="camera" label="Camera & Expression">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className={labelClass + " mb-1"}>Camera</span>
                            <select className={selectClass} value={scene.camera_angle || ""} onChange={(e) => updateSceneEntry('camera_angle', e.target.value)}>
                                <option value="">Auto</option>
                                {SCENE_OPTIONS.camera_angle?.map(shot => (
                                    <option key={shot.promptEN} value={shot.promptEN}>{shot.labelFR}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <span className={labelClass + " mb-1"}>Expression</span>
                            <select className={selectClass} value={scene.expression || ""} onChange={(e) => updateSceneEntry('expression', e.target.value)}>
                                <option value="">Auto</option>
                                {SCENE_OPTIONS.expression?.map(eff => (
                                    <option key={eff.promptEN} value={eff.promptEN}>{eff.labelFR}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Section>

                {/* ENVIRONNEMENT */}
                <Section id="environment" label="Environnement" badge={!isSandbox ? 'verrouille' : null}>
                    <select
                        className={selectClass + (isSandbox ? '' : ' opacity-40 cursor-not-allowed')}
                        value={scene.environment || ""}
                        onChange={(e) => updateSceneEntry('environment', e.target.value)}
                        disabled={!isSandbox}
                    >
                        {SCENE_OPTIONS.environment.map(env => (
                            <option key={env.promptEN} value={env.promptEN}>{env.labelFR}</option>
                        ))}
                    </select>
                    {isSandbox && (
                        <input
                            className="w-full mt-1.5 bg-zinc-950 border border-zinc-800/40 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500/40 transition-colors placeholder-zinc-700"
                            type="text"
                            placeholder="...ou decor custom en anglais"
                            onChange={(e) => { if (e.target.value.trim()) updateSceneEntry('environment', e.target.value); }}
                        />
                    )}
                </Section>

                {/* VIBE + LIGHTING */}
                <Section id="vibelighting" label="Vibe & Eclairage" badge={!isSandbox && (scene.vibe || scene.lighting) ? 'verrouille' : null}>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className={labelClass + " mb-1"}>Vibe</span>
                            <select
                                className={selectClass + (!isSandbox && scene.vibe ? ' opacity-40 cursor-not-allowed' : '')}
                                value={scene.vibe || ""}
                                onChange={(e) => updateSceneEntry('vibe', e.target.value)}
                                disabled={!isSandbox && !!scene.vibe}
                            >
                                <option value="">Neutre</option>
                                {SCENE_OPTIONS.vibe?.map(v => (
                                    <option key={v.promptEN} value={v.promptEN}>{v.labelFR}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <span className={labelClass + " mb-1"}>Eclairage</span>
                            <select
                                className={selectClass + (!isSandbox && scene.lighting ? ' opacity-40 cursor-not-allowed' : '')}
                                value={scene.lighting || ""}
                                onChange={(e) => updateSceneEntry('lighting', e.target.value)}
                                disabled={!isSandbox && !!scene.lighting}
                            >
                                <option value="">Auto</option>
                                {SCENE_OPTIONS.lighting?.map(l => (
                                    <option key={l.promptEN} value={l.promptEN}>{l.labelFR}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* MOMENT DU JOUR */}
                    {!isSandbox && scene.location_meta?.time_of_day && (
                        <div className="mt-2 p-2 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 font-medium">Moment du jour</span>
                                <span className="text-[10px] text-indigo-400/50 font-medium">verrouille</span>
                            </div>
                            <p className="text-[12px] text-zinc-400 mt-1">{scene.location_meta.time_of_day}</p>
                        </div>
                    )}
                </Section>

                {/* NEGATIVE PROMPT */}
                <Section id="negprompt" label="Negative Prompt">
                    <textarea
                        value={scene.custom_negative_prompt || ''}
                        onChange={(e) => updateSceneEntry('custom_negative_prompt', e.target.value)}
                        placeholder="Ajouter des elements a eviter (en anglais, separes par des virgules)..."
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800/60 text-zinc-400 text-[11px] font-mono rounded-lg px-3 py-2 outline-none focus:border-zinc-600 transition-colors resize-none"
                    />
                </Section>

            </div>
        </div>
    );
};

export default SceneEditor;
