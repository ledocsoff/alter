import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import SceneEditor from '../features/SceneEditor/SceneEditor';
import OutputPanel from '../features/OutputPanel/OutputPanel';

const GenerationView = () => {
    const { modelId, accountId, locationId } = useParams();
    const navigate = useNavigate();
    const { allModelsDatabase, setModel, updateSceneEntry, setActiveWorkflow } = useStudio();
    
    const [isLoaded, setIsLoaded] = useState(false);

    const isSandbox = locationId === 'sandbox';

    // 1. Récupération des données hiérarchiques (Niveau 1, 2, 3)
    const currentModel = allModelsDatabase.find(m => m.id === modelId);
    const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);
    
    // On cherche le Lieu (uniquement si !isSandbox)
    const currentLocation = isSandbox ? null : currentAccount?.locations?.find(l => l.id === locationId);

    // 2. Pré-chargement du Store (Le Cerveau)
    useEffect(() => {
        if (!currentModel || !currentAccount || (!isSandbox && !currentLocation)) {
            // Sécurité : redirection si données invalides (URL tapée à la main fausse)
            navigate('/');
            return;
        }

        // A. On charge physiquement l'influenceuse sélectionnée
        const { id, accounts, ...modelTraits } = currentModel;
        setModel({ ...modelTraits, name: currentModel.name });

        if (isSandbox) {
            // BAC A SABLE : Pas de compte actif strict, on veut TOUT relacher.
            setActiveWorkflow({ modelId: null, phoneId: null, accountId: null });
        } else {
             // MODE LIEU STRICT : On indique au store le compte actif pour restreindre les vêtements/lieux 
             // (Le Phone id n'existe plus en BDD mais on passe un fake pr valider la condition ds SceneEditor)
             setActiveWorkflow({ modelId, phoneId: "legacy_phone", accountId }); 

             // Règle du Niveau 3 : On force l'environnement du Store à coller au Loc.environment
             if (currentLocation?.environment) {
                 updateSceneEntry('environment', currentLocation.environment);
             }
        }
        
        setIsLoaded(true);

        // Nettoyage au démontage (Quitter la vue)
        return () => setActiveWorkflow({ modelId: null, phoneId: null, accountId: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentModel, isSandbox, currentLocation, modelId, accountId, setModel, setActiveWorkflow, navigate]);

    if (!isLoaded || !currentModel) return <div className="p-8 text-white">Initialisation du studio...</div>;

    return (
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#050505]">
            
            {/* HEADER NIVEAU 4 */}
            <div className="shrink-0 px-6 md:px-8 py-5 border-b border-gray-800 bg-[#0a0a0a] flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white text-sm transition-colors border border-gray-800 bg-gray-950 px-3 py-1.5 rounded-md">
                        ← Retour aux Lieux
                    </button>
                    <div className="flex items-center gap-3">
                        {isSandbox ? (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">🏖️</div>
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">📍</div>
                        )}
                        <div>
                            <h2 className="text-xl font-black text-white leading-tight">
                                {isSandbox ? "Bac à sable (Mode Libre)" : currentLocation?.name}
                            </h2>
                            <p className="text-gray-400 text-xs mt-0.5 tracking-wider uppercase">
                                Modèle : <span className="font-bold text-gray-300">{currentModel.name}</span> • Réseau : <span className="font-bold text-gray-300">{currentAccount?.handle}</span>
                            </p>
                        </div>
                    </div>
                </div>

                 {/* BADGE D'ÉTAT (Visible sur grand écran) */}
                <div className="hidden md:flex flex-col items-end">
                    {isSandbox ? (
                        <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                           🔓 Studio Ouvert (Zero Restriction)
                        </span>
                    ) : (
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-xs font-bold flex flex-col items-end">
                           <span>🔒 Environnement Verrouillé</span>
                        </span>
                    )}
                </div>
            </div>

            {/* ZONES DE CONTRASTES DE LA GÉNÉRATION (LES 2 ANCIENNES COLONNES) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-8">
                
                {/* COLONNE GAUCHE: ÉDITEUR DE SCÈNE (Ambiance, Vêtements, Poses) */}
                <div className="lg:col-span-7 h-full flex flex-col">
                     {/* On injecte notre  composant. Il se bride si 'isSandbox' est faux. */}
                     <SceneEditor />
                </div>

                {/* COLONNE DROITE: RÉSULTATS POUR NANO BANANA PRO */}
                <div className="lg:col-span-5 h-[80vh] sticky top-6">
                     <OutputPanel />
                </div>

            </div>

        </div>
    );
};

export default GenerationView;
