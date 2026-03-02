import React, { useState, useEffect } from 'react';
import { useStudio } from '../../store/StudioContext';
import { getSavedModels, saveModelData, deleteModelData } from '../../utils/storage';

const ModelManager = ({ isOpen, onClose }) => {
  const { model, setModel } = useStudio();
  const [savedModels, setSavedModels] = useState([]);
  const [newModelName, setNewModelName] = useState('');

  // Charger les modèles au montage de la modale
  useEffect(() => {
    if (isOpen) {
      setSavedModels(getSavedModels());
    }
  }, [isOpen]);

  // Sauvegarder la configuration actuelle, en écrasant 'name' par la saisie utilisateur
  const handleSaveCurrent = () => {
    if (!newModelName.trim()) return;
    
    // Génère un ID unique lors de la sauvegarde d'un *nouveau* modèle
    const modelToSave = {
      ...model,
      name: newModelName.trim(), 
      id: Date.now().toString(), 
    };

    const updatedList = saveModelData(modelToSave);
    if (updatedList) {
      setSavedModels(updatedList);
      setNewModelName(''); // Reset l'input
    }
  };

  // Charger un profil existant dans le Store global
  const handleLoadModel = (savedModel) => {
    // Si la bdd n'avait pas l'id pour les vieux modèles, on destructure prudemment
    const { id, ...modelFeatures } = savedModel;
    setModel({ ...modelFeatures, name: savedModel.name }); // On force le nom à être correct
    onClose(); // Ferme la modale
  };

  const handleDeleteModel = (id) => {
    if (!id) return;
    const updatedList = deleteModelData(id);
    if (updatedList) setSavedModels(updatedList);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER MODALE */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-black text-white">Base de Données Influenceuses</h2>
            <p className="text-gray-400 text-sm mt-1">Gère tes personnages récurrents (Body & Face ID).</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* CONTENU MODALE */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          
          {/* Section 1 : Sauvegarder l'actuel */}
          <div className="bg-gray-950 p-5 rounded-xl border border-blue-900/30 ring-1 ring-blue-500/20">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="text-blue-500">➕</span> Nouvelle Fiche (Settings Actuels)
            </h3>
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="Ex: Clara, French, Fit, Blonde..." 
                className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 outline-none transition-all focus:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrent()}
              />
              <button 
                onClick={handleSaveCurrent}
                disabled={!newModelName.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors border border-blue-500"
              >
                Sauvegarder
              </button>
            </div>
            <p className="text-xs text-blue-400/80 mt-3 font-medium flex items-center gap-1">
              ⓘ Les réglages de la colonne "Physique & Visage" (à gauche) seront figés sous ce nouveau nom.
            </p>
          </div>

          {/* Section 2 : Liste des modèles */}
          <div>
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Mes Influenceuses ({savedModels.length})</span>
            </h3>
            
            {savedModels.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-800/20 border border-dashed border-gray-700 rounded-xl">
                <span className="text-4xl block mb-2 opacity-50">📂</span>
                Aucune influenceuse enregistrée pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedModels.map((m) => (
                  <div key={m.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col justify-between group hover:border-blue-500/50 hover:bg-gray-800/80 transition-all shadow-sm relative overflow-hidden">
                    <div className="mb-4 relative z-10">
                      <div className="flex justify-between items-start mb-2 pr-6">
                         {/* Name with active indicator simulated visually */}
                        <h4 className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-green-500/50 block"></span>
                           {m.name || "Modèle Sans Nom"}
                        </h4>
                      </div>
                      
                      {/* Delete Button (absolute to avoid layout shift) */}
                       <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteModel(m.id); }}
                          className="absolute top-4 right-4 text-gray-500 hover:text-red-400 bg-gray-900 rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity border border-gray-700 hover:border-red-500"
                          title="Supprimer la fiche"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>

                      <div className="text-xs text-gray-400 flex flex-wrap gap-1.5 mt-3">
                        <span className="bg-gray-900 px-2 py-1 rounded-md border border-gray-700">{m.body?.type || "Standard"}</span>
                        <span className="bg-gray-900 px-2 py-1 rounded-md border border-gray-700">{m.hair?.color || "Brunette"}</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleLoadModel(m)}
                      className="w-full bg-gray-700 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 relative z-10 border border-gray-600 hover:border-blue-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="m9 15 2 2 4-4"></path></svg>
                      Sélectionner ce Personnage
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelManager;
