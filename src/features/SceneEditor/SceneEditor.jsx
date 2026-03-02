import React from 'react';
import { SCENE_OPTIONS } from '../../constants/sceneOptions';

const SceneEditor = ({ sceneState, updateSceneState }) => {
    
    return (
        <div className="bg-[#050505] border border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col h-full overflow-hidden">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 border-b border-gray-800 pb-4">
                <span className="text-orange-500">🎬</span> Scène & Action
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                
                {/* OUTFIT */}
                <div>
                    <label className="text-xs uppercase font-bold text-gray-500 mb-3 block tracking-wider">👗 Tenue Portée</label>
                    <textarea 
                        className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors custom-scrollbar"
                        rows="3"
                        placeholder="Ex: casual white crop top, light blue denim shorts, simple silver necklace..."
                        value={sceneState.outfit}
                        onChange={(e) => updateSceneState('outfit', e.target.value)}
                    ></textarea>
                </div>

                {/* ASPECT RATIO (NOUVEAU) */}
                <div>
                    <label className="text-xs uppercase font-bold text-gray-500 mb-3 block tracking-wider">📱 Format (Aspect Ratio)</label>
                    <div className="grid grid-cols-2 gap-3">
                        {SCENE_OPTIONS.aspect_ratio.map(ratio => (
                            <button 
                                key={ratio.promptEN}
                                onClick={() => updateSceneState('aspect_ratio', ratio.promptEN)}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
                                    sceneState.aspect_ratio === ratio.promptEN 
                                        ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold' 
                                        : 'bg-[#0a0a0a] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
                                }`}
                            >
                                <span className="text-lg mb-1">{ratio.icon}</span>
                                <span className="text-xs text-center">{ratio.labelFR}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* POSE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500 mb-3 block tracking-wider">🧍‍♀️ Pose / Action</label>
                        <textarea 
                            className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors custom-scrollbar"
                            rows="2"
                            placeholder="Ex: standing looking over shoulder, sitting casually on couch..."
                            value={sceneState.pose}
                            onChange={(e) => updateSceneState('pose', e.target.value)}
                        ></textarea>
                    </div>
                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500 mb-3 block tracking-wider">📸 Type de plan</label>
                        <select 
                            className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                            value={sceneState.shot_type}
                            onChange={(e) => updateSceneState('shot_type', e.target.value)}
                        >
                            <option value="">-- Automatique --</option>
                            {SCENE_OPTIONS.shot_type.map(shot => (
                                <option key={shot.promptEN} value={shot.promptEN}>{shot.labelFR}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* VIBE & LIGHTING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800/50">
                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500 mb-3 block tracking-wider">✨ Vibe Média</label>
                        <select 
                            className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500 transition-colors"
                            value={sceneState.vibe}
                            onChange={(e) => updateSceneState('vibe', e.target.value)}
                        >
                            <option value="">-- Neutre --</option>
                            {SCENE_OPTIONS.vibe.map(v => (
                                <option key={v.promptEN} value={v.promptEN}>{v.labelFR}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500 mb-3 block tracking-wider">💡 Éclairage</label>
                        <select 
                            className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500 transition-colors"
                            value={sceneState.lighting}
                            onChange={(e) => updateSceneState('lighting', e.target.value)}
                        >
                            <option value="">-- Automatique --</option>
                            {SCENE_OPTIONS.lighting.map(l => (
                                <option key={l.promptEN} value={l.promptEN}>{l.labelFR}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* EFFETS CAMERA */}
                <div>
                     <label className="text-xs uppercase font-bold text-gray-500 mb-3 block tracking-wider">🎥 Effets Caméra</label>
                     <select 
                        className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-300 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                        value={sceneState.camera_effect}
                        onChange={(e) => updateSceneState('camera_effect', e.target.value)}
                    >
                        <option value="">-- Sans effet --</option>
                        {SCENE_OPTIONS.camera_effect.map(eff => (
                            <option key={eff.promptEN} value={eff.promptEN}>{eff.labelFR}</option>
                        ))}
                    </select>
                </div>
                
            </div>
        </div>
    );
};

export default SceneEditor;
