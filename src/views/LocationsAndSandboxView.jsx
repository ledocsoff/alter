import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { saveLocationData, deleteLocationData } from '../utils/storage';
import { SCENE_OPTIONS } from '../constants/sceneOptions';

const LocationsAndSandboxView = () => {
    const { modelId, accountId } = useParams();
    const navigate = useNavigate();
    const { allModelsDatabase, setAllModelsDatabase } = useStudio();

    // 1. Inputs Formulaire Lieux
    const [newLocName, setNewLocName] = useState('');
    const [newLocEnv, setNewLocEnv] = useState(SCENE_OPTIONS.environment[0]); // Défaut

    // Retrouver Modèle > Compte
    const currentModel = allModelsDatabase.find(m => m.id === modelId);
    const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);

    if (!currentModel || !currentAccount) {
        return <div className="p-8 text-center text-gray-500">Compte introuvable. <button onClick={() => navigate('/')} className="text-blue-500 underline">Retour</button></div>;
    }

    // --- LOGIQUE LIEUX (ESPACE A) ---
    const handleCreateLocation = () => {
        if (!newLocName.trim()) return;
        const newLocation = {
            name: newLocName.trim(),
            environment: newLocEnv, 
        };
        const updated = saveLocationData(modelId, accountId, newLocation);
        if (updated) {
            setAllModelsDatabase(updated);
            setNewLocName('');
        }
    };

    const handleDeleteLocation = (e, locId) => {
        e.stopPropagation();
        if(confirm(`Supprimer définitivement ce lieu ?`)) {
             const updated = deleteLocationData(modelId, accountId, locId);
             if (updated) setAllModelsDatabase(updated);
        }
    };

    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0a0a0a]">
            
            {/* ========================================================= */}
            {/* ESPACE A (GAUCHE - ~70%) : GESTION DES LIEUX (CRUD)       */}
            {/* ========================================================= */}
            <div className="flex-1 md:w-2/3 lg:w-3/4 flex flex-col border-r border-gray-800 overflow-y-auto custom-scrollbar">
                <div className="p-6 md:p-8">
                    
                    {/* BREADCRUMB / HEADER */}
                    <div className="mb-8">
                        <button onClick={() => navigate(`/models/${modelId}/accounts`)} className="text-gray-500 hover:text-white text-sm mb-4 transition-colors">
                            ← Retour aux Comptes
                        </button>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <span className="text-indigo-500">📍</span> Lieux & Décors de {currentAccount.handle}
                        </h2>
                        <p className="text-gray-400 mt-1 text-sm">Créez des "Lieux" récurrents pour assurer une cohérence d'un post à l'autre.</p>
                    </div>

                    {/* FORMULAIRE D'AJOUT DE LIEU */}
                    <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl mb-8 shadow-inner">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <span className="text-indigo-400">➕</span> Nouveau Lieu Récurrent
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-4">
                                <label className="text-xs text-gray-500 mb-1 block font-bold">Nom usuel (Ex: Chambre Principale)</label>
                                <input 
                                    type="text" 
                                    placeholder="Nom du décor..." 
                                    className="w-full bg-[#050505] border border-gray-800 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors"
                                    value={newLocName}
                                    onChange={(e) => setNewLocName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateLocation()}
                                />
                            </div>
                            <div className="md:col-span-6">
                                <label className="text-xs text-gray-500 mb-1 block font-bold">Environnement Générateur (Base IA)</label>
                                <select 
                                    value={newLocEnv} 
                                    onChange={(e) => setNewLocEnv(e.target.value)}
                                    className="w-full bg-[#050505] border border-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500"
                                >
                                    {SCENE_OPTIONS.environment.map(env => (
                                        <option key={env} value={env}>{env}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <button 
                                    onClick={handleCreateLocation}
                                    disabled={!newLocName.trim()}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* LISTE DES LIEUX (GRILLE NIVEAU 3) */}
                    <div className="border border-dashed border-gray-800 my-8 w-full"></div>

                    {(currentAccount.locations || []).length === 0 ? (
                        <div className="text-center py-16 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
                            <span className="text-5xl block mb-3 opacity-30">🛋️</span>
                            <p className="text-lg font-bold text-gray-400 mb-1">Aucun lieu récurrent paramétré.</p>
                            <p className="text-sm text-gray-500">Ajoutez un décor de base ci-dessus (ex: Salle de sport).</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentAccount.locations.map(loc => (
                                <div 
                                    key={loc.id}
                                    // NAVIGATION NIVEAU 4 -> GENERATION DANS CE LIEU (Pré-rempli)
                                    onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/${loc.id}/generate`)}
                                    className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer group hover:bg-gradient-to-br from-gray-900 to-indigo-900/20 transition-all shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <h4 className="font-bold text-white text-lg leading-tight group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                             <span className="text-indigo-500">📍</span> {loc.name}
                                        </h4>
                                        <button 
                                            onClick={(e) => handleDeleteLocation(e, loc.id)}
                                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1.5 bg-[#050505] rounded-md transition-opacity border border-gray-800"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <div className="mt-auto relative z-10">
                                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-widest">Environnement IA ciblé :</div>
                                        <p className="text-xs text-indigo-300 leading-snug bg-[#050505] px-3 py-2 rounded-lg border border-gray-800">
                                            {loc.environment}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================= */}
            {/* ESPACE B (DROITE - ~30%) : BAC À SABLE (SANDBOX)          */}
            {/* ========================================================= */}
            <div className="md:w-1/3 lg:w-1/4 bg-[#050505] border-t md:border-t-0 md:border-l border-gray-800 p-6 md:p-8 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                
                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                        <span className="text-orange-500">🏖️</span> Bac à sable
                    </h3>
                    <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                        Mode libre total. Idéal pour une story improvisée, un événement temporaire ou un shooting unique sans le rattacher définitivement aux lieux du profil.
                    </p>

                    {/* NAVIGATION NIVEAU 4 -> GENERATION SANDBOX (ID magique 'sandbox') */}
                    <button 
                        onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/sandbox/generate`)}
                        className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-black text-lg py-5 px-6 rounded-2xl transition-all shadow-[0_10px_30px_rgba(249,115,22,0.2)] hover:shadow-orange-500/30 hover:-translate-y-1 active:scale-95 flex flex-col items-center gap-1 group border border-orange-400/50"
                    >
                        Créer en Mode Libre
                        <span className="text-[10px] uppercase font-bold opacity-80 tracking-widest mt-1 group-hover:opacity-100">Générateur (Toutes Options 🔓)</span>
                    </button>
                    
                    <div className="mt-6 p-4 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-500">
                        <span className="font-bold text-gray-400">Note :</span> Le Bac à sable charge physiquement {currentModel.name}, mais laisse tous les dropdowns de mise en scène déverrouillés pour une création express.
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LocationsAndSandboxView;
