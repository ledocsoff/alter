import React, { useState } from 'react';
import { useStudio } from '../../store/StudioContext';
import { SCENE_OPTIONS, OUTFIT_PRESETS } from '../../constants/sceneOptions';
import { updateAccountRestrictions } from '../../utils/storage';

// -- COMPOSANT BILINGUE : Select Simple --
const DropdownSelect = ({ label, optionsData, value, onChange, disabled }) => {
  // on cherche l'option correspondante pour la pré-sélection (value est en EN)
  return (
    <div className="flex flex-col mb-4">
      <label className="text-sm font-medium text-gray-400 mb-1.5">{label}</label>
      <select
        disabled={disabled}
        className={`bg-gray-800 border ${disabled ? 'border-orange-900/50 text-orange-400 cursor-not-allowed font-bold' : 'border-gray-700 text-gray-200 focus:ring-blue-500 focus:border-blue-500'} text-sm rounded-lg block w-full p-2.5 transition-colors`}
        value={value}
        onChange={onChange}
      >
        {optionsData.map((opt) => (
          <option key={opt.promptEN} value={opt.promptEN}>
            {opt.labelFR}
          </option>
        ))}
      </select>
    </div>
  );
};

// -- COMPOSANT : Titre de Section --
const SectionTitle = ({ title }) => (
  <h3 className="text-lg font-bold text-gray-100 mt-2 mb-4 border-b border-gray-700 pb-2 uppercase tracking-wider">
      {title}
  </h3>
);

// -- COMPOSANT : Grille de Vêtements --
const PresetGrid = ({ items, selected, onSelect }) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
              selected?.id === item.id
                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750 hover:border-gray-500'
            }`}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
          </button>
        ))}
      </div>
    );
};

const SceneEditor = ({ forceLockedEnvironment = false }) => {
  const { scene, updateSceneEntry } = useStudio();
  
  // State interne local pour savoir si l'utilisateur a décidé de forcer l'ouverture du cadenas de lieu
  const [userUnlockedEnv, setUserUnlockedEnv] = useState(!forceLockedEnvironment);

  // Déterminer s'il faut afficher l'avertissement
  const showWarning = forceLockedEnvironment && userUnlockedEnv;

  return (
    <div className="bg-gray-900/50 rounded-2xl shadow-lg border border-gray-800 p-6 md:p-8 h-full flex flex-col relative overflow-y-auto custom-scrollbar">
      
      {/* 1. SEPARATION LIEU (Isolé & Verrouillable) */}
      <SectionTitle title="1. Environnement & Origine" />
      
      <div className={`p-4 rounded-xl mb-8 border ${showWarning ? 'border-orange-500/50 bg-orange-950/10' : 'border-gray-800 bg-[#0a0a0a]'}`}>
          
          <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <span className={userUnlockedEnv ? 'text-gray-500' : 'text-orange-500'}>{userUnlockedEnv ? '🔓' : '🔒'}</span> 
                  Lieu Physique (Base IA)
              </label>
              
              {forceLockedEnvironment && (
                  <button 
                      onClick={() => setUserUnlockedEnv(!userUnlockedEnv)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${userUnlockedEnv ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
                  >
                      {userUnlockedEnv ? 'Re-Verrouiller le lieu' : 'Déverrouiller et Modifier'}
                  </button>
              )}
          </div>

          <select
              disabled={!userUnlockedEnv}
              className={`w-full text-base rounded-lg p-3 outline-none transition-colors ${!userUnlockedEnv ? 'bg-gray-900 border border-gray-800 text-gray-400 cursor-not-allowed' : 'bg-[#050505] border border-orange-500 focus:border-orange-400 text-white'}`}
              value={scene.environment}
              onChange={(e) => updateSceneEntry('environment', e.target.value)}
          >
              {SCENE_OPTIONS.environment.map((opt) => (
                  <option key={opt.promptEN} value={opt.promptEN}>{opt.labelFR}</option>
              ))}
          </select>

          {showWarning && (
              <p className="text-xs text-orange-400 mt-3 flex gap-2">
                  <span>⚠️</span> 
                  Attention : ce lieu était verrouillé par sécurité. Toute modification textuelle ici altère l'histoire du lieu actif en cours.
              </p>
          )}

      </div>

      {/* 2. SEPARATION AMBIANCE ET ACCESSOIRES (Toujours libre) */}
      <SectionTitle title="2. Ambiance & Garde-Robe" />
      
      <div className="bg-[#050505] border border-gray-800 p-5 rounded-xl mb-8">
            <h4 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Vestiaire</h4>
            <PresetGrid
                items={OUTFIT_PRESETS}
                selected={scene.outfit}
                onSelect={(preset) => updateSceneEntry('outfit', preset)}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 pt-4 border-t border-gray-800/50">
                <DropdownSelect label="Directives Vibe Photographiques" optionsData={SCENE_OPTIONS.vibe} value={scene.vibe} onChange={(e) => updateSceneEntry('vibe', e.target.value)} />
                <DropdownSelect label="Qualité de la Lumière IA" optionsData={SCENE_OPTIONS.lighting} value={scene.lighting} onChange={(e) => updateSceneEntry('lighting', e.target.value)} />
            </div>
      </div>

       {/* 3. POSTURE ET EXPRESSION */}
       <SectionTitle title="3. Mise en Scène" />
       
       <div className="bg-[#050505] border border-gray-800 p-5 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="md:col-span-2">
                     <DropdownSelect label="Pose & Posture" optionsData={SCENE_OPTIONS.pose} value={scene.pose} onChange={(e) => updateSceneEntry('pose', e.target.value)} />
                </div>
                <DropdownSelect label="Objectif Caméra" optionsData={SCENE_OPTIONS.camera_angle} value={scene.camera_angle} onChange={(e) => updateSceneEntry('camera_angle', e.target.value)} />
                <DropdownSelect label="Expression du Visage" optionsData={SCENE_OPTIONS.expression} value={scene.expression} onChange={(e) => updateSceneEntry('expression', e.target.value)} />
            </div>
       </div>

    </div>
  );
};

export default SceneEditor;
