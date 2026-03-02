import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { saveModelData, getSavedModels } from '../utils/storage';
import ModelEditor from '../features/ModelEditor/ModelEditor'; // On recycle l'ancien bloc des menus déroulants
import { DEFAULT_MODEL } from '../constants/modelOptions';

const ModelEditorShell = ({ mode }) => {
  const navigate = useNavigate();
  const { modelId } = useParams();
  const { model, setModel, setAllModelsDatabase } = useStudio();
  
  const [modelName, setModelName] = useState('');

  useEffect(() => {
    if (mode === 'edit' && modelId) {
        // En mode Édition, on charge les données du modèle depuis la BDD locale
        const dbModels = getSavedModels();
        const existingModel = dbModels.find(m => m.id === modelId);
        if (existingModel) {
            setModelName(existingModel.name);
            const { id, accounts, ...modelFeatures } = existingModel;
            setModel({ ...modelFeatures, name: existingModel.name });
        }
    } else {
        // En mode Création, on réinitialise à Jessi (DEFAULT_MODEL)
        setModel(DEFAULT_MODEL);
        setModelName('');
    }
  }, [mode, modelId, setModel]);

  const handleSave = () => {
      if (!modelName.trim()) {
          alert("Veuillez donner un nom à cette influenceuse.");
          return;
      }

      const modelToSave = {
          ...model,
          name: modelName.trim(),
          id: mode === 'edit' ? modelId : `mod_${Date.now()}` // Si Edition, on garde l'ID
      };

      const updatedDB = saveModelData(modelToSave);
      setAllModelsDatabase(updatedDB);
      
      // Retour à l'accueil
      navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden h-full">
      <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 transition-colors">
                  ← Annuler
              </button>
              <h2 className="text-2xl font-black text-white">
                  {mode === 'edit' ? 'Éditer Fiche Identité' : 'Créer Influenceuse'}
              </h2>
          </div>
          <button 
              onClick={handleSave} 
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-[0_0_15px_rgba(22,163,74,0.3)] shadow-green-500/20"
          >
              💾 Sauvegarder l'Avatar
          </button>
      </div>

      {/* HEADER : NOM DE L'INFLUENCEUSE */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 shrink-0 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-purple-900/40">
              {modelName ? modelName.charAt(0).toUpperCase() : '👤'}
          </div>
          <div className="flex-1">
              <label className="text-sm font-bold text-gray-400 mb-2 block uppercase tracking-wide">Pseudonyme / Nom de ce Modèle virtuel :</label>
              <input 
                  type="text" 
                  autoFocus
                  placeholder="Ex: Clara, 22ans, Bodybuilder..." 
                  className="w-full bg-[#050505] border border-gray-700 text-white text-xl font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 outline-none transition-all placeholder-gray-600"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
          </div>
      </div>

      {/* LE RESTE : LES REGLAGES PHYSIQUES (On réutilise l'ancien composant Column 1) */}
      <div className="flex-1 min-h-0 bg-gray-900 rounded-2xl border border-gray-800 p-1">
          <ModelEditor />
      </div>
    </div>
  );
};

export default ModelEditorShell;
