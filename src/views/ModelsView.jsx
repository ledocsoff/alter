import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { deleteModelData } from '../utils/storage';

const ModelsView = () => {
  const navigate = useNavigate();
  const { allModelsDatabase, setAllModelsDatabase, setModel } = useStudio();
  const [isEditing, setIsEditing] = useState(false); // Mode "Création/Refonte" sur l'Accueil

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if(confirm("Supprimer ce modèle et tous ses comptes ?")) {
        const updated = deleteModelData(id);
        setAllModelsDatabase(updated);
    }
  };

  const handleSelectModel = (m) => {
      // On charge son FaceID/Body pour plus tard
      const { id, accounts, ...modelTraits } = m;
      setModel({ ...modelTraits, name: m.name });
      // On PLONGE dans l'entonnoir (Comptes)
      navigate(`/models/${id}/accounts`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
      
      {/* HEADER NIVEAU 1 */}
      <div className="mb-8 flex justify-between items-end border-b border-gray-800 pb-4">
          <div>
              <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  <span className="text-blue-500">👱‍♀️</span> Vos Modèles IA
              </h2>
              <p className="text-gray-400 mt-1">Sélectionnez une influenceuse pour gérer ses réseaux sociaux.</p>
          </div>
          <button 
              onClick={() => navigate('/models/new')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] shadow-blue-500/20"
          >
              + Nouveau Modèle
          </button>
      </div>

      {allModelsDatabase.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 border border-dashed border-gray-700 rounded-2xl">
              <span className="text-5xl block mb-4">✨</span>
              <h3 className="text-xl font-bold text-white mb-2">Aucun avatar enregistré</h3>
              <p className="text-gray-400">Commencez par créer votre première influenceuse virtuelle.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allModelsDatabase.map(m => (
                  <div 
                      key={m.id} 
                      onClick={() => handleSelectModel(m)}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-5 cursor-pointer hover:bg-gray-800 hover:border-blue-500/50 transition-all group flex flex-col justify-between min-h-[160px] relative overflow-hidden shadow-lg"
                  >
                      {/* LIGNE DECORATIVE */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      
                      {/* EN TETE CARTE */}
                      <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-black text-white">{m.name}</h3>
                          <button 
                              onClick={(e) => handleDelete(e, m.id)}
                              className="text-gray-500 hover:text-red-400 p-1 bg-gray-950 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Supprimer définitivement"
                          >
                            🗑️
                          </button>
                      </div>

                      {/* STATISTIQUES */}
                      <div className="text-sm text-gray-400 mt-auto">
                          <div className="flex gap-2 mb-2 flex-wrap">
                              <span className="bg-gray-950 px-2.5 py-1 rounded text-xs border border-gray-800">{m.ethnicity || "Standard"}</span>
                              <span className="bg-gray-950 px-2.5 py-1 rounded text-xs border border-gray-800">{m.hair?.color || "Brunette"}</span>
                          </div>
                          <div className="text-blue-400 font-bold border-t border-gray-800 pt-3 mt-3">
                              {(m.accounts || []).length} Compte(s) Social
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}

    </div>
  );
};

export default ModelsView;
