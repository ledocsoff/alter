import React from 'react';
import { SCENE_OPTIONS } from '../../constants/sceneOptions';

const SceneEditor = ({ sceneState, updateSceneState }) => {
    
    return (
        <div className="bg-[#050505] border border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col h-full overflow-hidden">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 border-b border-gray-800 pb-4">
                <span className="text-orange-500">🎬</span> Scène & Action
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                
                {/* OUTFIT (Dressing / Pilules Cliquables) */}
                <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800/60">
                    <label className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-3 block flex items-center gap-2">👗 <span className="text-gray-300">Garde-robe (Tenue)</span></label>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                        {[
                            { id: "casual", label: "Casual / Été", prompt: "casual summer dress, flowing fabric" },
                            { id: "gym", label: "Sport (Yoga)", prompt: "tight yoga pants and sports bra set, gym wear" },
                            { id: "bikini", label: "Bikini", prompt: "triangle bikini, minimal fabric" },
                            { id: "lingerie", label: "Lingerie", prompt: "delicate lace lingerie set" },
                            { id: "office", label: "Bureau Chic", prompt: "fitted skirt, white silk blouse" },
                            { id: "night", label: "Robe Soirée", prompt: "tight bodycon dress, elegant" }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => updateSceneState('outfit', item.prompt)}
                                className={`text-[11px] py-2 px-2 rounded-lg border text-center transition-all duration-200 ${
                                    sceneState?.outfit === item.prompt
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold shadow-[0_0_10px_rgba(249,115,22,0.15)] scale-[1.02]'
                                        : 'bg-black/50 border-gray-700/50 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <textarea 
                        className="w-full bg-[#0a0a0a] border border-gray-800/80 text-gray-300 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 transition-colors custom-scrollbar placeholder-gray-600"
                        rows="1"
                        placeholder="...ou taper une tenue sur-mesure manuellement"
                        value={sceneState?.outfit || ""}
                        onChange={(e) => updateSceneState('outfit', e.target.value)}
                    ></textarea>
                </div>

                {/* POSE (Attitude / Boutons Pilules) */}
                <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800/60">
                    <label className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-3 block flex items-center gap-2">🧍‍♀️ <span className="text-gray-300">Posture du Modèle</span></label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {[
                            { label: "Debout", prompt: "casual standing, hand on hip" },
                            { label: "Selfie", prompt: "holding phone for selfie" },
                            { label: "Assise", prompt: "sitting casually, legs crossed" },
                            { label: "De Dos", prompt: "looking over shoulder" },
                            { label: "Allongée", prompt: "laying down" }
                        ].map(item => (
                            <button
                                key={item.label}
                                onClick={() => updateSceneState('pose', item.prompt)}
                                className={`text-xs py-1.5 px-3 rounded-full border transition-all duration-200 ${
                                    sceneState?.pose === item.prompt
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                                        : 'bg-black/50 border-gray-700/50 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <input 
                        className="w-full bg-[#0a0a0a] border border-gray-800/80 text-gray-300 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 transition-colors placeholder-gray-600"
                        type="text"
                        placeholder="...ou éditer la pose spécifiquement (main hanche, regard ciel...)"
                        value={sceneState?.pose || ""}
                        onChange={(e) => updateSceneState('pose', e.target.value)}
                    />
                </div>

                {/* ASPECT RATIO */}
                <div>
                    <label className="text-xs uppercase font-bold text-gray-500 mb-3 block tracking-wider mt-5">📱 Format (Aspect Ratio)</label>
                    <div className="grid grid-cols-2 gap-3">
                        {SCENE_OPTIONS.aspect_ratio.map(ratio => (
                            <button 
                                key={ratio.promptEN}
                                onClick={() => updateSceneState('aspect_ratio', ratio.promptEN)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                                    sceneState?.aspect_ratio === ratio.promptEN 
                                        ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold' 
                                        : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white hover:bg-gray-800/60'
                                }`}
                            >
                                <span className="text-xl mb-1.5">{ratio.icon}</span>
                                <span className="text-[10px] uppercase font-bold text-center">{ratio.labelFR}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* PLANS ET FACIAL EXPR (Grille 2 colonnes) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="bg-black/20 p-3 rounded-xl border border-gray-800/40">
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-wider">📸 Angle de Caméra</label>
                        <select 
                            className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500 transition-colors"
                            value={sceneState?.camera_angle || ""}
                            onChange={(e) => updateSceneState('camera_angle', e.target.value)}
                        >
                            <option value="">-- Automatique --</option>
                            {SCENE_OPTIONS.camera_angle?.map(shot => (
                                <option key={shot.promptEN} value={shot.promptEN}>{shot.labelFR}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="bg-black/20 p-3 rounded-xl border border-gray-800/40">
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-wider">🎭 Expression Faciale</label>
                        <select 
                            className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500 transition-colors"
                            value={sceneState?.expression || ""}
                            onChange={(e) => updateSceneState('expression', e.target.value)}
                        >
                            <option value="">-- Automatique --</option>
                            {SCENE_OPTIONS.expression?.map(eff => (
                                <option key={eff.promptEN} value={eff.promptEN}>{eff.labelFR}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* VIBE & LIGHTING (Grille 2 colonnes) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/30 p-3 rounded-xl border border-gray-800/50 mt-2">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-wider">✨ Vibe & Rendu</label>
                        <select 
                            className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500 transition-colors"
                            value={sceneState?.vibe || ""}
                            onChange={(e) => updateSceneState('vibe', e.target.value)}
                        >
                            <option value="">-- Neutre --</option>
                            {SCENE_OPTIONS.vibe?.map(v => (
                                <option key={v.promptEN} value={v.promptEN}>{v.labelFR}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-wider">💡 Éclairage</label>
                        <select 
                            className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500 transition-colors"
                            value={sceneState?.lighting || ""}
                            onChange={(e) => updateSceneState('lighting', e.target.value)}
                        >
                            <option value="">-- Automatique --</option>
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
