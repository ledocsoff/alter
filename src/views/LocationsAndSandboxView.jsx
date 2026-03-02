import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { saveLocationData, deleteLocationData } from '../utils/storage';
import { SCENE_OPTIONS } from '../constants/sceneOptions';

const LocationsAndSandboxView = () => {
    const { modelId, accountId } = useParams();
    const navigate = useNavigate();
    const { allModelsDatabase, setAllModelsDatabase } = useStudio();

    // ETATS FORMULAIRE (Mode "Création" OU "Édition")
    const [locFormMode, setLocFormMode] = useState('create'); // 'create' ou l'ID 'loc_xyz' d'édition
    const [newLocName, setNewLocName] = useState('');
    // State pour savoir s'il tape manuellement son lieu custom ou non
    const [isCustomEnv, setIsCustomEnv] = useState(false);
    const [newLocEnvDrop, setNewLocEnvDrop] = useState(SCENE_OPTIONS.environment[0]);
    const [newLocEnvCustom, setNewLocEnvCustom] = useState('');

    // Retrouver Modèle > Compte
    const currentModel = allModelsDatabase.find(m => m.id === modelId);
    const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);

    if (!currentModel || !currentAccount) {
        return <div className="p-8 text-center text-gray-500">Compte introuvable. <button onClick={() => navigate('/')} className="text-blue-500 underline">Retour</button></div>;
    }

    // --- ACTIONS DU FORMULAIRE ---
    const handleSaveLocation = () => {
        if (!newLocName.trim()) return;
        
        const finalEnvironment = isCustomEnv ? newLocEnvCustom.trim() : newLocEnvDrop;
        if (!finalEnvironment) return; // Sécurité

        const locationData = {
            name: newLocName.trim(),
            environment: finalEnvironment, 
        };

        // Si on est Mode Edition, on donne le même ID pour écraser
        if (locFormMode !== 'create') {
            locationData.id = locFormMode; 
        }

        const updated = saveLocationData(modelId, accountId, locationData);
        if (updated) {
            setAllModelsDatabase(updated);
            resetForm();
        }
    };

    const handleDeleteLocation = (e, locId) => {
        e.stopPropagation();
        if(confirm(`Supprimer définitivement ce lieu ?`)) {
             const updated = deleteLocationData(modelId, accountId, locId);
             if (updated) setAllModelsDatabase(updated);
             if (locFormMode === locId) resetForm();
        }
    };

    const enterEditMode = (e, loc) => {
        e.stopPropagation(); // Évite le clic sur la carte = navigation niveau 4
        setLocFormMode(loc.id);
        setNewLocName(loc.name);
        
        // Si le prompt du lieu en base N'EST PAS dans notre liste déroulante, c'est forcément un Custom
        if (!SCENE_OPTIONS.environment.includes(loc.environment)) {
            setIsCustomEnv(true);
            setNewLocEnvCustom(loc.environment);
        } else {
            setIsCustomEnv(false);
            setNewLocEnvDrop(loc.environment);
        }
        
        // Scroll vers le haut fluide (Pour voir le formulaire que l'on vient de remplir avec la donnée)
        document.getElementById('espace-lieux-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setLocFormMode('create');
        setNewLocName('');
        setIsCustomEnv(false);
        setNewLocEnvCustom('');
        setNewLocEnvDrop(SCENE_OPTIONS.environment[0]);
    };

    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0a0a0a]">
            
            {/* ========================================================= */}
            {/* ESPACE A (GAUCHE - ~70%) : GESTION DES LIEUX (CRUD)       */}
            {/* ========================================================= */}
            <div id="espace-lieux-scroll" className="flex-1 md:w-2/3 lg:w-3/4 flex flex-col border-r border-gray-800 overflow-y-auto custom-scrollbar">
                <div className="p-6 md:p-8">
                    
                    {/* BREADCRUMB / HEADER */}
                    <div className="mb-8">
                        <button onClick={() => navigate(`/models/${modelId}/accounts`)} className="text-gray-500 hover:text-white text-sm mb-4 transition-colors">
                            ← Retour aux Comptes
                        </button>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <span className="text-indigo-500">📍</span> Lieux & Décors
                        </h2>
                        <p className="text-gray-400 mt-1 text-sm">Créez des "Lieux" récurrents hyper-crédibles pour assurer une cohérence d'un post à l'autre.</p>
                    </div>

                    {/* L'EDITEUR : FORMULAIRE D'AJOUT OU MODIFICATION DE LIEU */}
                    <div className={`border p-6 rounded-2xl mb-8 shadow-inner transition-colors duration-500 ${locFormMode === 'create' ? 'bg-gray-900 border-gray-800' : 'bg-indigo-950/20 border-indigo-500/50'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-white">
                                {locFormMode === 'create' ? <span className="text-indigo-400">➕ Créer un Lieu</span> : <span className="text-orange-400">✏️ Édition du Lieu</span>}
                            </h3>
                            {locFormMode !== 'create' && (
                                <button onClick={resetForm} className="text-xs text-gray-500 hover:text-gray-300">Annuler l'édition ✕</button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            
                            {/* NOM */}
                            <div className="lg:col-span-4">
                                <label className="text-xs text-gray-500 mb-2 block font-bold">Nom usuel métier (ex: Chambre Emma)</label>
                                <input 
                                    type="text" 
                                    placeholder="Nom du décor..." 
                                    className="w-full bg-[#050505] border border-gray-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
                                    value={newLocName}
                                    onChange={(e) => setNewLocName(e.target.value)}
                                    autoFocus={locFormMode !== 'create'}
                                />
                            </div>

                            {/* ENVIRONNEMENT IA */}
                            <div className="lg:col-span-8 rounded-xl border border-gray-800 bg-[#050505] p-1 flex flex-col items-stretch">
                                
                                {/* 1) Togle Type Standard VS Custom */}
                                <div className="flex w-full mb-3 p-1">
                                    <button 
                                        onClick={() => setIsCustomEnv(false)} 
                                        className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-colors ${!isCustomEnv ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-900'}`}
                                    >
                                        Sélection (Presets Normaux)
                                    </button>
                                    <button 
                                        onClick={() => setIsCustomEnv(true)} 
                                        className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-colors ${isCustomEnv ? 'bg-blue-900/40 text-blue-400 border border-blue-800' : 'text-gray-500 hover:bg-gray-900'}`}
                                    >
                                        Manuel (Texte Libre 📝)
                                    </button>
                                </div>

                                {/* 2) L'Input en fonction du toggle */}
                                <div className="px-2 pb-2">
                                     {!isCustomEnv ? (
                                        <select 
                                            value={newLocEnvDrop} 
                                            onChange={(e) => setNewLocEnvDrop(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-gray-800 transition-colors"
                                        >
                                            {SCENE_OPTIONS.environment.map(env => (
                                                <option key={env} value={env}>{env}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <textarea 
                                            placeholder="Ex: Small student apartment bathroom with a dirty mirror and makeup tools on the sink..."
                                            value={newLocEnvCustom}
                                            onChange={(e) => setNewLocEnvCustom(e.target.value)}
                                            rows={2}
                                            className="w-full bg-gray-900 border border-blue-900/60 text-blue-100 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors custom-scrollbar resize-none placeholder-blue-900/50"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* BOUTON VALIDATION */}
                            <div className="lg:col-span-12 mt-1 border-t border-gray-800/50 pt-5 flex justify-end">
                                <button 
                                    onClick={handleSaveLocation}
                                    disabled={!newLocName.trim() || (isCustomEnv && !newLocEnvCustom.trim())}
                                    className={`py-2 px-8 rounded-lg font-bold transition-all disabled:opacity-50 ${locFormMode === 'create' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]'}`}
                                >
                                    {locFormMode === 'create' ? '+ Enregistrer' : '💾 Mettre à jour'}
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* ======================================================== */}
                    {/* GRILLE D'AFFICHAGE DES LIEUX (CARTES)                    */}
                    {/* ======================================================== */}
                    
                    <h3 className="text-xl font-bold text-white mb-4 mt-10">Lieux Enregistrés</h3>

                    {(currentAccount.locations || []).length === 0 ? (
                        <div className="text-center py-16 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
                            <span className="text-5xl block mb-3 opacity-30">🛋️</span>
                            <p className="text-lg font-bold text-gray-400 mb-1">C'est encore vide.</p>
                            <p className="text-sm text-gray-500">Ajoutez le "Domicile" de votre modèle ci-dessus.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentAccount.locations.map(loc => (
                                <div 
                                    key={loc.id}
                                    // LA NAVIGATION : Un clic sur la carte (hors des potits boutons) va au Niveau 4
                                    onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/${loc.id}/generate`)}
                                    className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer group hover:bg-gradient-to-br from-gray-900 to-indigo-900/20 transition-all shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-2 relative z-10 w-full">
                                        <h4 className="font-bold text-white text-lg leading-tight group-hover:text-indigo-400 transition-colors flex items-center gap-2 w-[70%]">
                                             <span className="text-indigo-500">📍</span> <span className="truncate">{loc.name}</span>
                                        </h4>
                                        <div className="flex gap-2">
                                            {/* BOUTON EDITION (EMPECHE LA NAVIGATION VUE 4) */}
                                             <button 
                                                onClick={(e) => enterEditMode(e, loc)}
                                                className="text-gray-500 hover:text-orange-400 bg-[#050505] hover:bg-gray-800 border border-gray-800 p-2 rounded-lg transition-colors shadow-sm"
                                                title="Modifier ce lieu"
                                            >
                                                ✏️
                                            </button>
                                            {/* BOUTON SUPPRESSION */}
                                            <button 
                                                onClick={(e) => handleDeleteLocation(e, loc.id)}
                                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 p-2 bg-[#050505] rounded-lg transition-opacity border border-gray-800"
                                                title="Supprimer"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-auto relative z-10">
                                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-widest flex justify-between items-end">
                                            <span>Environnement IA Prompté :</span>
                                            {/* On affiche un badge "Custom" si ce texte n'était pas dans la liste de base */}
                                            {!SCENE_OPTIONS.environment.includes(loc.environment) && <span className="bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-900">Custom Tool</span>}
                                        </div>
                                        <p className="text-xs text-indigo-300 leading-relaxed bg-[#050505] px-3 py-3 rounded-lg border border-gray-800 h-[60px] overflow-hidden text-ellipsis">
                                            {loc.environment}
                                        </p>
                                    </div>

                                    {/* EFFET SURVOL */}
                                    <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors z-0 flex items-center justify-center">
                                         <span className="opacity-0 group-hover:opacity-100 text-indigo-400 font-black text-xl tracking-wider transition-all scale-75 group-hover:scale-100 drop-shadow-md">
                                            LANCER STUDIO →
                                         </span>
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
                <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
                
                <div className="relative z-10 mx-auto w-full max-w-sm">
                    <h3 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                        <span className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">🏖️</span> Bac à sable
                    </h3>
                    <p className="text-sm text-gray-400 mb-10 leading-relaxed">
                        Studio 100% déverrouillé. Utile pour une story éphémère (ex: aéroport), sans besoin de créer un "Lieu" récurrent dans la base de données.
                    </p>

                    {/* NAVIGATION NIVEAU 4 -> GENERATION SANDBOX */}
                    <button 
                        onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/sandbox/generate`)}
                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xl py-6 px-6 rounded-2xl transition-all shadow-[0_10px_30px_rgba(249,115,22,0.15)] hover:shadow-orange-500/30 hover:-translate-y-1 active:scale-95 flex flex-col items-center gap-2 group border border-orange-500/50"
                    >
                        <span>🎬 Lancer Générateur</span>
                        <span className="text-[10px] uppercase font-bold opacity-70 tracking-widest leading-none bg-black/20 px-3 py-1 rounded-full group-hover:bg-black/30 w-max">Zero Limitation</span>
                    </button>
                </div>
            </div>

        </div>
    );
};

export default LocationsAndSandboxView;
