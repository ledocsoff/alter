import React, { useState } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';
import { SCENE_OPTIONS, OUTFIT_PRESETS, DEFAULT_SCENE } from '../../constants/sceneOptions';
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

    const handleRandomize = () => {
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
    };

    const handleSaveTemplate = () => {
        if (!templateName.trim()) return;
        const updated = saveSceneTemplate(templateName.trim(), scene);
        setTemplates(updated);
        setTemplateName('');
        toast.success(`Template "${templateName.trim()}" sauvegarde`);
    };

    const handleLoadTemplate = (tpl) => {
        setScene({
            ...tpl.scene,
            environment: scene.environment,
            location_meta: scene.location_meta,
        });
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
            <div className="flex items-center justify-between mb-4 shrink-0">
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
                        onClick={() => setScene({ ...DEFAULT_SCENE, environment: scene.environment, location_meta: scene.location_meta })}
                        className="text-[11px] font-medium text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 px-2.5 py-1 rounded-md transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* TEMPLATES PANEL */}
            {showTemplates && (
                <div className="mb-4 p-3 bg-zinc-950/80 border border-zinc-800/60 rounded-lg shrink-0">
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

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">

                {/* FORMAT */}
                <div className="flex gap-1.5">
                    {SCENE_OPTIONS.aspect_ratio.map(ratio => (
                        <button
                            key={ratio.promptEN}
                            onClick={() => updateSceneEntry('aspect_ratio', ratio.promptEN)}
                            className={`flex-1 text-[12px] py-2 rounded-lg border transition-all font-medium ${
                                scene.aspect_ratio === ratio.promptEN
                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                    : 'bg-transparent border-zinc-800/60 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700'
                            }`}
                        >
                            {ratio.labelFR}
                        </button>
                    ))}
                </div>

                {/* ENVIRONMENT */}
                <div className={`p-3 rounded-lg border ${isSandbox ? 'border-amber-500/15 bg-amber-500/[0.03]' : 'border-zinc-800/40 bg-zinc-950/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={labelClass + " mb-0"}>Environnement</span>
                        {!isSandbox && <span className="text-[10px] text-indigo-400/50 font-medium">verrouille</span>}
                    </div>
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
                </div>

                {/* OUTFIT */}
                <div>
                    <span className={labelClass}>Tenue</span>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                        {OUTFIT_PRESETS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => updateSceneEntry('outfit', item)}
                                className={`text-[11px] py-1.5 px-1 rounded-lg border text-center transition-all ${
                                    scene.outfit?.id === item.id
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
                </div>

                {/* POSE */}
                <div>
                    <span className={labelClass}>Pose</span>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {SCENE_OPTIONS.pose.map(item => (
                            <button
                                key={item.promptEN}
                                onClick={() => updateSceneEntry('pose', item.promptEN)}
                                className={`text-[11px] py-1 px-2.5 rounded-full border transition-all ${
                                    scene.pose === item.promptEN
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
                </div>

                {/* CAMERA + EXPRESSION */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <span className={labelClass}>Camera</span>
                        <select className={selectClass} value={scene.camera_angle || ""} onChange={(e) => updateSceneEntry('camera_angle', e.target.value)}>
                            <option value="">Auto</option>
                            {SCENE_OPTIONS.camera_angle?.map(shot => (
                                <option key={shot.promptEN} value={shot.promptEN}>{shot.labelFR}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <span className={labelClass}>Expression</span>
                        <select className={selectClass} value={scene.expression || ""} onChange={(e) => updateSceneEntry('expression', e.target.value)}>
                            <option value="">Auto</option>
                            {SCENE_OPTIONS.expression?.map(eff => (
                                <option key={eff.promptEN} value={eff.promptEN}>{eff.labelFR}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* VIBE + LIGHTING */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <span className={labelClass}>Vibe</span>
                        <select className={selectClass} value={scene.vibe || ""} onChange={(e) => updateSceneEntry('vibe', e.target.value)}>
                            <option value="">Neutre</option>
                            {SCENE_OPTIONS.vibe?.map(v => (
                                <option key={v.promptEN} value={v.promptEN}>{v.labelFR}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <span className={labelClass}>Eclairage</span>
                        <select className={selectClass} value={scene.lighting || ""} onChange={(e) => updateSceneEntry('lighting', e.target.value)}>
                            <option value="">Auto</option>
                            {SCENE_OPTIONS.lighting?.map(l => (
                                <option key={l.promptEN} value={l.promptEN}>{l.labelFR}</option>
                            ))}
                        </select>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SceneEditor;
