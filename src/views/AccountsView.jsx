import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { saveAccountData, deleteAccountData } from '../utils/storage';

const AccountsView = () => {
    const { modelId } = useParams();
    const navigate = useNavigate();
    const { allModelsDatabase, setAllModelsDatabase } = useStudio();

    const [newAccountHandle, setNewAccountHandle] = useState('');
    const [newAccountPlatform, setNewAccountPlatform] = useState('Instagram');

    // Trouver le modèle courant dans la BDD
    const currentModel = allModelsDatabase.find(m => m.id === modelId);

    if (!currentModel) {
        return <div className="p-8 text-center text-gray-500">Modèle introuvable. <button onClick={() => navigate('/')} className="text-blue-500 underline">Retour à l'accueil</button></div>;
    }

    const handleCreateAccount = () => {
        if (!newAccountHandle.trim()) return;
        const newAccount = {
            handle: newAccountHandle.trim(),
            platform: newAccountPlatform
        };
        const updated = saveAccountData(modelId, newAccount);
        if (updated) {
            setAllModelsDatabase(updated);
            setNewAccountHandle('');
        }
    };

    const handleDeleteAccount = (e, accountId) => {
        e.stopPropagation();
        if(confirm(`Supprimer ce compte et tous ses lieux (ainsi que son bac à sable) ?`)) {
             const updated = deleteAccountData(modelId, accountId);
             if (updated) setAllModelsDatabase(updated);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#0a0a0a]">
            
            {/* EN TETE DU NIVEAU 2 : ON RAPPELLE LE NIVEAU 1 */}
            <div className="mb-10 lg:w-2/3 xl:w-1/2">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white text-sm mb-4 transition-colors">
                  ← Retour à la liste des Influenceuses
                </button>
                <div className="border border-gray-800 bg-gray-950/80 backdrop-blur-md rounded-3xl p-6 shadow-xl flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-4xl shadow-lg border border-blue-400/30">
                        <span className="drop-shadow-md">👱‍♀️</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-black text-white tracking-tight">{currentModel.name}</h2>
                            <button onClick={() => navigate(`/models/${modelId}/edit`)} className="bg-gray-800 hover:bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 transition-colors border border-gray-600">✏️ Éditer Visage/Corps</button>
                        </div>
                        <p className="text-gray-400 text-sm">{currentModel.ethnicity} • {currentModel.body?.type || "Standard"}</p>
                    </div>
                </div>
            </div>

            {/* HEADER LISTE -> NIVEAU 2 */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-6">
                <div>
                     <h3 className="text-2xl font-bold text-white flex items-center gap-2">📱 Architecture Réseaux Sociaux</h3>
                     <p className="text-gray-400 text-sm mt-1">Gérez les différents comptes de {currentModel.name}.</p>
                </div>
                
                {/* CREATEUR DE COMPTE */}
                <div className="flex gap-2 w-full md:w-auto bg-gray-900 border border-gray-800 p-2 rounded-xl shadow-lg shadow-gray-950">
                    <select 
                        value={newAccountPlatform} 
                        onChange={(e) => setNewAccountPlatform(e.target.value)}
                        className="bg-[#050505] border border-gray-800 text-gray-300 text-sm rounded-lg px-3 outline-none"
                    >
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Tinder">Tinder</option>
                        <option value="OnlyFans">OnlyFans</option>
                    </select>
                    <input 
                        type="text" 
                        placeholder="@username" 
                        className="bg-[#050505] flex-1 md:w-48 border border-gray-800 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-2 outline-none placeholder-gray-600 transition-all"
                        value={newAccountHandle}
                        onChange={(e) => setNewAccountHandle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                    />
                    <button 
                        onClick={handleCreateAccount}
                        disabled={!newAccountHandle.trim()}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Ajouter
                    </button>
                </div>
            </div>

            <div className="border border-dashed border-gray-800 my-8 w-full"></div>

            {/* GRILLE DES COMPTES (NIVEAU 2) */}
            {(currentModel.accounts || []).length === 0 ? (
                <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl mx-auto">
                     <span className="text-6xl block mb-4 opacity-50">📱</span>
                     <p className="text-xl font-bold text-gray-300 mb-2">Aucun compte social associé.</p>
                     <p className="text-sm text-gray-500">Ajoutez un profil Instagram ou TikTok ci-dessus pour définir ses décors.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentModel.accounts.map(acc => (
                        <div 
                            key={acc.id}
                            onClick={() => navigate(`/models/${modelId}/accounts/${acc.id}/locations`)}
                            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 cursor-pointer hover:-translate-y-1 hover:border-blue-500/50 hover:bg-gradient-to-b hover:from-gray-800 hover:to-gray-900 hover:shadow-[0_10px_30px_rgba(59,130,246,0.15)] transition-all group flex flex-col justify-between"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#050505] flex items-center justify-center text-2xl shadow-inner border border-gray-800">
                                        {acc.platform === 'Instagram' ? '📸' : acc.platform === 'TikTok' ? '🎵' : acc.platform === 'Tinder' ? '🔥' : '🔞'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg leading-tight group-hover:text-blue-400 transition-colors">{acc.handle}</h4>
                                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest leading-none">{acc.platform}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteAccount(e, acc.id)}
                                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[#050505] rounded-lg border border-gray-800"
                                    title="Supprimer compte"
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="border-t border-gray-800 pt-4 flex justify-between items-center text-sm mb-4">
                                <span className="text-gray-400 flex items-center gap-2">📍 Lieux Actifs :</span>
                                <span className="font-bold text-white bg-[#050505] px-3 py-1 rounded-md border border-gray-800">
                                    {(acc.locations || []).length}
                                </span>
                            </div>
                            
                            <div className="bg-blue-600/10 text-blue-400 border border-blue-500/20 font-bold py-2.5 rounded-lg text-center opacity-70 group-hover:opacity-100 transition-all text-sm group-hover:bg-blue-600 group-hover:text-white">
                                Ouvrir le Compte →
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AccountsView;
