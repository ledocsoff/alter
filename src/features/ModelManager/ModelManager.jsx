import React, { useState, useEffect } from 'react';
import { useStudio } from '../../store/StudioContext';
import { getSavedModels, saveModelData, deleteModelData, addPhoneToModel, deletePhoneFromModel, addAccountToPhone, deleteAccountFromPhone } from '../../utils/storage';

const ModelManager = ({ isOpen, onClose }) => {
  const { model, setModel, allModelsDatabase, setAllModelsDatabase, activeWorkflow, setActiveWorkflow } = useStudio();
  
  // Navigation State
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [selectedPhoneId, setSelectedPhoneId] = useState(null);
  
  // Input States
  const [newModelName, setNewModelName] = useState('');
  const [newPhoneName, setNewPhoneName] = useState('');
  const [newAccountHandle, setNewAccountHandle] = useState('');

  // S'assurer de charger la DB fraîche
  useEffect(() => {
    if (isOpen) {
      setAllModelsDatabase(getSavedModels());
    }
  }, [isOpen, setAllModelsDatabase]);

  // Récupérer les données dérivées de l'ID sélectionné
  const selectedModel = allModelsDatabase.find(m => m.id === selectedModelId);
  const selectedPhone = selectedModel?.phones?.find(p => p.id === selectedPhoneId);

  // --- ACTIONS (NIVEAU 1 : MODEL) ---
  const handleSaveCurrentModel = () => {
    if (!newModelName.trim()) return;
    const modelToSave = { ...model, name: newModelName.trim(), id: Date.now().toString(), phones: [] };
    const updated = saveModelData(modelToSave);
    if (updated) { setAllModelsDatabase(updated); setNewModelName(''); setSelectedModelId(modelToSave.id); }
  };
  const handleDeleteModel = (id) => {
    setAllModelsDatabase(deleteModelData(id) || []);
    if (selectedModelId === id) setSelectedModelId(null);
  };

  // --- ACTIONS (NIVEAU 2 : PHONE) ---
  const handleAddPhone = () => {
    if (!newPhoneName.trim() || !selectedModelId) return;
    const updated = addPhoneToModel(selectedModelId, newPhoneName.trim());
    if (updated) { setAllModelsDatabase(updated); setNewPhoneName(''); }
  };
  const handleDeletePhone = (phoneId) => {
    const updated = deletePhoneFromModel(selectedModelId, phoneId);
    if (updated) { setAllModelsDatabase(updated); setSelectedPhoneId(null); }
  };

  // --- ACTIONS (NIVEAU 3 : ACCOUNT) ---
  const handleAddAccount = (platform) => {
      if (!newAccountHandle.trim() || !selectedModelId || !selectedPhoneId) return;
      const accountData = { handle: newAccountHandle, platform, allowed_environments: [], allowed_outfits: [] };
      const updated = addAccountToPhone(selectedModelId, selectedPhoneId, accountData);
      if (updated) { setAllModelsDatabase(updated); setNewAccountHandle(''); }
  };
  const handleDeleteAccount = (accountId) => {
      const updated = deleteAccountFromPhone(selectedModelId, selectedPhoneId, accountId);
      if (updated) setAllModelsDatabase(updated);
  };

  // --- CHARGER UN WORKFLOW (PLAY) ---
  const handleLoadWorkflow = (modelData, phoneId, accountId) => {
      const { id, phones, ...modelFeatures } = modelData;
      // 1. Charge les visuels sur l'application (colonne gauche)
      setModel({ ...modelFeatures, name: modelData.name });
      // 2. Informe l'application que nous sommes dans un contexte restreint (Verrouille UI)
      setActiveWorkflow({ modelId: modelData.id, phoneId, accountId });
      onClose(); // Ferme le hub
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER GEELARK HUB */}
        <div className="px-8 py-5 border-b border-gray-800 flex justify-between items-center bg-gray-950/40">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xl shadow-lg shadow-blue-900/40">📱</div>
             <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Geelark OFM Hub</h2>
                <p className="text-gray-400 text-xs mt-0.5 tracking-wide uppercase font-semibold">Cohérence narrative multi-comptes</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full w-10 h-10 flex items-center justify-center transition-colors font-bold text-lg">✕</button>
        </div>

        {/* CONTENU (MASTER / DETAIL) */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* PANNEAU GAUCHE : LISTE DES MODELES (MASTER) */}
            <div className="w-1/3 bg-gray-950/80 border-r border-gray-800 flex flex-col overflow-y-auto custom-scrollbar">
                
                <div className="p-6 border-b border-gray-800 sticky top-0 bg-gray-950/90 backdrop-blur-sm z-10">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Nouvelle Influenceuse</h3>
                    <div className="flex flex-col gap-2">
                        <input type="text" placeholder="Ex: Clara, 22ans, Fit..." className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-4 py-3 outline-none transition-all placeholder-gray-600" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrentModel()} />
                        <button onClick={handleSaveCurrentModel} disabled={!newModelName.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-lg w-full transition-colors flex justify-center items-center gap-2"><span>✚</span> Figer l'Avatar Actuel (UI)</button>
                    </div>
                </div>

                <div className="p-4 flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2 mt-4">Database Modèles</h3>
                    {allModelsDatabase.length === 0 ? (
                        <div className="text-center py-8 text-gray-600 text-sm">Aucun avatar. Enregistrez la vue actuelle ↑</div>
                    ) : (
                        allModelsDatabase.map(m => (
                            <div 
                                key={m.id} 
                                onClick={() => { setSelectedModelId(m.id); setSelectedPhoneId(null); }}
                                className={`p-4 rounded-xl cursor-pointer border transition-all relative overflow-hidden group ${selectedModelId === m.id ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className={`text-lg font-bold ${selectedModelId === m.id ? 'text-blue-400' : 'text-gray-200'}`}>{m.name}</h4>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteModel(m.id); }} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                                </div>
                                <div className="text-xs text-gray-500 mt-2 flex items-center gap-3">
                                    <span>📱 {m.phones?.length || 0} Téléphones</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PANNEAU DROIT : DETAILS DU WORKFLOW (PHONES > ACCOUNTS) */}
            <div className="flex-1 bg-[#0a0a0a] flex flex-col overflow-y-auto custom-scrollbar">
                
                {!selectedModelId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <div className="text-6xl mb-4 opacity-30">📱</div>
                        <p className="text-lg">Sélectionnez une influenceuse à gauche.</p>
                        <p className="text-sm mt-2 opacity-60">Créez ensuite les téléphones et réseaux qui lui sont attribués.</p>
                    </div>
                ) : (
                    <div className="p-8">
                        {/* EN-TETE DU MODEL SELECTIONNE */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-16 w-16 bg-gray-800 rounded-full border border-gray-700 flex items-center justify-center font-bold text-2xl text-gray-300">
                                {selectedModel.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white">{selectedModel.name}</h2>
                                <p className="text-gray-400 text-sm">{selectedModel.ethnicity} • {selectedModel.hair.color}</p>
                            </div>
                        </div>

                        {/* SECTION : AJOUT TELEPHONE */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 shadow-inner">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="text-indigo-400">📱</span> Parc Téléphonique (Geelark)</h3>
                            <div className="flex gap-3">
                                <input type="text" placeholder="Ex: iPhone 12 Pro_A, Geelark x8..." className="flex-1 bg-gray-950 border border-gray-800 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 outline-none" value={newPhoneName} onChange={(e) => setNewPhoneName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()} />
                                <button onClick={handleAddPhone} disabled={!newPhoneName.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors">Ajouter Téléphone</button>
                            </div>
                        </div>

                        {/* LISTE DES TELEPHONES ET LEURS COMPTES */}
                        <div className="flex flex-col gap-6">
                            {(selectedModel.phones || []).map(phone => (
                                <div key={phone.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                                    
                                    {/* HEADER PHONE */}
                                    <div className="bg-gray-800/80 border-b border-gray-700 p-4 flex justify-between items-center cursor-pointer" onClick={() => setSelectedPhoneId(selectedPhoneId === phone.id ? null : phone.id)}>
                                        <h4 className="font-bold text-gray-200 text-lg flex items-center gap-2">📱 {phone.name} <span className="text-xs bg-gray-900 px-2 py-0.5 rounded text-gray-400 font-mono">{phone.accounts?.length || 0} comptes</span></h4>
                                        <div className="flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleDeletePhone(phone.id); }} className="text-gray-500 hover:text-red-400 px-2">Supprimer</button>
                                        </div>
                                    </div>

                                    {/* CORPS PHONE (ACCOUNTS) - Affiché seulement si "ouvert" */}
                                    {selectedPhoneId === phone.id && (
                                        <div className="p-6 bg-gray-900/20">
                                            
                                            {/* Ajout de compte */}
                                            <div className="flex gap-3 mb-6">
                                                <input type="text" placeholder="@handle_instagram ou TikTok" className="flex-1 bg-gray-950 border border-gray-800 text-white text-sm rounded-lg px-3 py-2" value={newAccountHandle} onChange={(e) => setNewAccountHandle(e.target.value)} />
                                                <button onClick={() => handleAddAccount('Instagram')} disabled={!newAccountHandle.trim()} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-lg">+ Instagram</button>
                                                <button onClick={() => handleAddAccount('TikTok')} disabled={!newAccountHandle.trim()} className="bg-black hover:bg-gray-800 border-gray-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-lg">+ TikTok</button>
                                            </div>

                                            {/* Liste des comptes */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(phone.accounts || []).map(acc => (
                                                    <div key={acc.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 relative group">
                                                        <div className="flex items-start justify-between mb-3 border-b border-gray-700 pb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">{acc.platform === 'Instagram' ? '📸' : '🎵'}</span>
                                                                <div>
                                                                    <div className="font-bold text-white leading-tight">{acc.handle}</div>
                                                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">{acc.platform}</div>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => handleDeleteAccount(acc.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1">🗑️</button>
                                                        </div>

                                                        <div className="space-y-2 mb-4">
                                                            <div className="text-xs text-gray-400 flex justify-between"><span>Backgrounds:</span> <span className="text-blue-400">{acc.allowed_environments?.length === 0 ? "Tous 🔓" : `${acc.allowed_environments.length} 🔒`}</span></div>
                                                            <div className="text-xs text-gray-400 flex justify-between"><span>Vêtements:</span> <span className="text-blue-400">{acc.allowed_outfits?.length === 0 ? "Tous 🔓" : `${acc.allowed_outfits.length} 🔒`}</span></div>
                                                        </div>

                                                        {/* LE BOUTON MAGIQUE QUI CHARGE TOUT LE STUDIO */}
                                                        <button 
                                                            onClick={() => handleLoadWorkflow(selectedModel, phone.id, acc.id)}
                                                            className="w-full bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/30 font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                                                        >
                                                            <span>▶</span> Activer ce Workflow
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default ModelManager;
