import React, { useState } from 'react';
import { useStudio } from '../../store/StudioContext';
import { SCENE_OPTIONS, OUTFIT_PRESETS } from '../../constants/sceneOptions';
import { updateAccountRestrictions } from '../../utils/storage';

// -- COMPOSANT : Select Simple --
const DropdownSelect = ({ label, options, value, onChange, disabled }) => (
  <div className="flex flex-col mb-3">
    <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
    <select
      disabled={disabled}
      className={`bg-gray-800 border ${disabled ? 'border-indigo-900/50 text-indigo-400 cursor-not-allowed font-bold' : 'border-gray-700 text-gray-200'} text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors`}
      value={value}
      onChange={onChange}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

// -- COMPOSANT : Titre de Section --
const SectionTitle = ({ title, activeBadge }) => (
  <h3 className="text-lg font-bold text-gray-100 mt-6 mb-4 border-b border-gray-700 pb-2 uppercase tracking-wider flex items-center justify-between">
      <span>{title}</span>
      {activeBadge && <span className="text-[10px] bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-700">{activeBadge}</span>}
  </h3>
);

// -- COMPOSANT : Grille de Presets (Vêtements) --
const PresetGrid = ({ items, selected, onSelect, allowedIds = [] }) => {
    // Si on a des restrictions (allowedIds non vide), on filtre
    const isRestricted = allowedIds && allowedIds.length > 0;
    const finalItems = isRestricted ? items.filter(item => allowedIds.includes(item.id)) : items;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {finalItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
              selected?.id === item.id
                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750 hover:border-gray-500'
            }`}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
          </button>
        ))}
        
        {isRestricted && finalItems.length === 0 && (
            <div className="col-span-full text-center p-4 text-xs text-red-400 border border-dashed border-red-900/50 rounded-lg">
                ⚠️ Aucune tenue vestimentaire autorisée pour ce compte. Ouvrez le cadenas.
            </div>
        )}
      </div>
    );
}

const SceneEditor = () => {
  const { scene, updateSceneEntry, activeWorkflow, allModelsDatabase, setAllModelsDatabase } = useStudio();
  const [isEditingRestrictions, setIsEditingRestrictions] = useState(false);

  // --- LOGIQUE DE RESTRICTION ---
  const isWorkflowActive = Boolean(activeWorkflow.modelId && activeWorkflow.phoneId && activeWorkflow.accountId);
  
  let activeAccount = null;
  if (isWorkflowActive) {
      const dbModel = allModelsDatabase.find(m => m.id === activeWorkflow.modelId);
      const dbPhone = dbModel?.phones?.find(p => p.id === activeWorkflow.phoneId);
      activeAccount = dbPhone?.accounts?.find(a => a.id === activeWorkflow.accountId);
  }

  // Listes filtrées dynamiquement
  const allowedEnvironments = activeAccount?.allowed_environments?.length > 0 
      ? activeAccount.allowed_environments 
      : SCENE_OPTIONS.environment; 

  const allowedOutfitIds = activeAccount?.allowed_outfits || [];


  // --- SAUVEGARDE DES RESTRICTIONS EN DIRECT ---
  const handleToggleEnvironment = (envName) => {
      if (!activeAccount) return;
      const currentList = activeAccount.allowed_environments || [];
      const isAlreadyAllowed = currentList.includes(envName);
      
      const newList = isAlreadyAllowed 
          ? currentList.filter(e => e !== envName) 
          : [...currentList, envName];

      const updatedDB = updateAccountRestrictions(activeWorkflow.modelId, activeWorkflow.phoneId, activeWorkflow.accountId, { environments: newList });
      if (updatedDB) setAllModelsDatabase(updatedDB);
      
      // Sécurité : si on décoche l'environnement actuellement affiché, on force un environnement valide
      if (isAlreadyAllowed && scene.environment === envName && newList.length > 0) updateSceneEntry('environment', newList[0]);
  };

  const handleToggleOutfit = (outfitId) => {
      if (!activeAccount) return;
      const currentList = activeAccount.allowed_outfits || [];
      const isAlreadyAllowed = currentList.includes(outfitId);
      
      const newList = isAlreadyAllowed 
          ? currentList.filter(e => e !== outfitId)
          : [...currentList, outfitId];

      const updatedDB = updateAccountRestrictions(activeWorkflow.modelId, activeWorkflow.phoneId, activeWorkflow.accountId, { outfits: newList });
      if (updatedDB) setAllModelsDatabase(updatedDB);
  }

  return (
    <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6 h-full flex flex-col relative">
      
      {/* HEADER BANDEAU ACTIF (Sticky) */}
      {isWorkflowActive && activeAccount ? (
          <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4 mb-4 shadow-inner relative overflow-hidden group shrink-0">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h4 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Mode Cohérence Activé</h4>
              <p className="text-white text-lg font-black">{activeAccount.handle} <span className="text-sm font-normal text-gray-400">({activeAccount.platform})</span></p>
              
              <button 
                  onClick={() => setIsEditingRestrictions(!isEditingRestrictions)}
                  className={`mt-3 text-xs border px-3 py-1.5 rounded w-full text-left flex justify-between items-center transition-colors ${isEditingRestrictions ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-900/40 hover:bg-indigo-800 border-indigo-700/50 text-indigo-200'}`}
              >
                  <span>{isEditingRestrictions ? "Terminer l'édition des restrictions" : "🔒 Restreindre la Garde-robe & Lieux"}</span>
                  <span>{isEditingRestrictions ? "▲" : "▼"}</span>
              </button>
          </div>
      ) : (
          <div className="shrink-0 mb-4">
            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Paramètres de Scène</h2>
            <p className="text-gray-400 text-sm">Libre (Aucun profil d'influenceuse chargé).</p>
          </div>
      )}

      {/* --- LE CORPS --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          
          {/* PANEL D'EDITION (ACCORDEON) */}
          {isEditingRestrictions && activeAccount && (
              <div className="bg-[#050505] border border-gray-800 rounded-xl p-4 mb-6 shadow-inner">
                   {/* Checklist Décors */}
                   <div className="mb-6">
                       <p className="text-xs text-gray-400 mb-2 font-bold flex justify-between">
                          <span>Lieux Autorisés ({activeAccount.allowed_environments?.length || 0})</span>
                          {activeAccount.allowed_environments?.length === 0 && <span className="text-green-500">Tous 🔓</span>}
                       </p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {SCENE_OPTIONS.environment.map(env => {
                                const isChecked = activeAccount.allowed_environments?.includes(env);
                                return (
                                    <label key={env} className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${isChecked ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-200' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}>
                                        <input type="checkbox" className="mt-0.5 accent-indigo-500 w-3 h-3" checked={isChecked || false} onChange={() => handleToggleEnvironment(env)} />
                                        <span className="text-[10px] uppercase font-semibold leading-tight">{env}</span>
                                    </label>
                                );
                            })}
                       </div>
                   </div>

                    {/* Checklist Tenues */}
                   <div>
                       <p className="text-xs text-gray-400 mb-2 font-bold flex justify-between">
                          <span>Garde-Robe Autorisée ({activeAccount.allowed_outfits?.length || 0})</span>
                          {activeAccount.allowed_outfits?.length === 0 && <span className="text-green-500">Toutes 🔓</span>}
                       </p>
                       <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {OUTFIT_PRESETS.map(outfit => {
                                const isChecked = activeAccount.allowed_outfits?.includes(outfit.id);
                                return (
                                    <label key={outfit.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${isChecked ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-200' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}>
                                        <input type="checkbox" className="accent-indigo-500 w-3 h-3" checked={isChecked || false} onChange={() => handleToggleOutfit(outfit.id)} />
                                        <span className="text-xs">{outfit.icon} {outfit.label}</span>
                                    </label>
                                );
                            })}
                       </div>
                   </div>
              </div>
          )}


          {/* EDITEUR DE SCENE STANDARD (Grisé si édition restriction) */}
          <div className={`transition-opacity duration-300 ${isEditingRestrictions ? 'opacity-20 pointer-events-none' : ''}`}>
              
              <SectionTitle title="Vêtements & Outfits" activeBadge={activeAccount?.allowed_outfits?.length > 0 ? "Filtré" : null} />
              <PresetGrid
                items={OUTFIT_PRESETS}
                selected={scene.outfit}
                onSelect={(preset) => updateSceneEntry('outfit', preset)}
                allowedIds={allowedOutfitIds} 
              />

              <SectionTitle title="Lieu & Ambiance" activeBadge={activeAccount?.allowed_environments?.length > 0 ? "Filtré" : null} />
              <div className="grid grid-cols-1 gap-x-4 mt-2">
                <DropdownSelect 
                    label={allowedEnvironments.length === 1 ? "Environnement (Verrouillé 🔒)" : "Environnement (Lieu)"} 
                    options={allowedEnvironments} 
                    value={scene.environment} 
                    onChange={(e) => updateSceneEntry('environment', e.target.value)} 
                    disabled={allowedEnvironments.length === 1} 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <DropdownSelect label="Style de Photo (Vibe)" options={SCENE_OPTIONS.vibe} value={scene.vibe} onChange={(e) => updateSceneEntry('vibe', e.target.value)} />
                    <DropdownSelect label="Éclairage (Lighting)" options={SCENE_OPTIONS.lighting} value={scene.lighting} onChange={(e) => updateSceneEntry('lighting', e.target.value)} />
                </div>
              </div>

              <SectionTitle title="Photographie & Posture" />
              <div className="grid grid-cols-1 gap-x-4 mt-2">
                <DropdownSelect label="Pose du Modèle" options={SCENE_OPTIONS.pose} value={scene.pose} onChange={(e) => updateSceneEntry('pose', e.target.value)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <DropdownSelect label="Angle de Caméra" options={SCENE_OPTIONS.camera_angle} value={scene.camera_angle} onChange={(e) => updateSceneEntry('camera_angle', e.target.value)} />
                    <DropdownSelect label="Expression" options={SCENE_OPTIONS.expression} value={scene.expression} onChange={(e) => updateSceneEntry('expression', e.target.value)} />
                </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default SceneEditor;
