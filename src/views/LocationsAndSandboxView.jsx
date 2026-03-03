import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { saveLocationData, deleteLocationData, duplicateLocation, getLocationLockScore } from '../utils/storage';
import { SCENE_OPTIONS } from '../constants/sceneOptions';

const TIME_OF_DAY_OPTIONS = [
    { labelFR: "Matin (lumiere douce)", promptEN: "morning, soft early light" },
    { labelFR: "Apres-midi", promptEN: "afternoon, bright ambient light" },
    { labelFR: "Golden hour", promptEN: "golden hour, warm sunset light" },
    { labelFR: "Soiree / Nuit", promptEN: "evening, night time, artificial indoor lighting" },
    { labelFR: "Nuit club", promptEN: "late night, club atmosphere, colored lights" },
];

const inputClass = "w-full bg-zinc-950 border border-zinc-800/60 text-zinc-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700";
const selectClass = "w-full bg-zinc-950 border border-zinc-800/60 text-zinc-300 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-zinc-600 transition-colors";
const labelClass = "text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block";

const LockScore = ({ location }) => {
    const { filled, total } = getLocationLockScore(location);
    return (
        <div className="flex items-center gap-1.5">
            <div className="flex gap-px">
                {Array.from({ length: total }, (_, i) => (
                    <div
                        key={i}
                        className={`w-1.5 h-3 rounded-sm transition-colors ${i < filled
                                ? filled >= 5 ? 'bg-emerald-500' : filled >= 3 ? 'bg-amber-500' : 'bg-zinc-600'
                                : 'bg-zinc-800'
                            }`}
                    />
                ))}
            </div>
            <span className={`text-[10px] font-medium ${filled >= 5 ? 'text-emerald-500/70' : filled >= 3 ? 'text-amber-500/70' : 'text-zinc-600'
                }`}>{filled}/{total}</span>
        </div>
    );
};

const LocationsAndSandboxView = () => {
    const { modelId, accountId } = useParams();
    const navigate = useNavigate();
    const { allModelsDatabase, setAllModelsDatabase } = useStudio();
    const toast = useToast();

    const [locFormMode, setLocFormMode] = useState('create');
    const [newLocName, setNewLocName] = useState('');
    const [isCustomEnv, setIsCustomEnv] = useState(false);
    const [newLocEnvDrop, setNewLocEnvDrop] = useState(SCENE_OPTIONS.environment[0].promptEN);
    const [newLocEnvCustom, setNewLocEnvCustom] = useState('');
    const [newLocLighting, setNewLocLighting] = useState('');
    const [newLocVibe, setNewLocVibe] = useState('');
    const [newLocTimeOfDay, setNewLocTimeOfDay] = useState('');
    const [newLocAnchorDetails, setNewLocAnchorDetails] = useState('');
    const [newLocColorPalette, setNewLocColorPalette] = useState('');
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const currentModel = allModelsDatabase.find(m => m.id === modelId);
    const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);

    if (!currentModel || !currentAccount) {
        return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Compte introuvable. <button onClick={() => navigate('/')} className="text-amber-500 ml-1 underline">Retour</button></div>;
    }

    const presetEnvironmentsEN = SCENE_OPTIONS.environment.map(env => env.promptEN);

    // Get all other accounts for duplication target
    const otherAccounts = [];
    allModelsDatabase.forEach(m => {
        m.accounts?.forEach(a => {
            if (!(m.id === modelId && a.id === accountId)) {
                otherAccounts.push({ modelId: m.id, modelName: m.name, accountId: a.id, handle: a.handle, platform: a.platform });
            }
        });
    });

    const handleSaveLocation = () => {
        if (!newLocName.trim()) return;
        const finalEnvironment = isCustomEnv ? newLocEnvCustom.trim() : newLocEnvDrop;
        if (!finalEnvironment) return;

        const locationData = {
            name: newLocName.trim(),
            environment: finalEnvironment,
            default_lighting: newLocLighting,
            default_vibe: newLocVibe,
            time_of_day: newLocTimeOfDay,
            anchor_details: newLocAnchorDetails.trim(),
            color_palette: newLocColorPalette.trim(),
        };
        if (locFormMode !== 'create') locationData.id = locFormMode;

        const updated = saveLocationData(modelId, accountId, locationData);
        if (updated) {
            setAllModelsDatabase(updated);
            toast.success(locFormMode === 'create' ? `"${locationData.name}" cree` : `Lieu mis a jour`);
            resetForm();
        }
    };

    const handleDeleteLocation = (e, locId) => {
        e.stopPropagation();
        if (pendingDeleteId === locId) {
            const loc = currentAccount.locations.find(l => l.id === locId);
            const updated = deleteLocationData(modelId, accountId, locId);
            if (updated) setAllModelsDatabase(updated);
            if (locFormMode === locId) resetForm();
            setPendingDeleteId(null);
            toast.success(`"${loc?.name || 'Lieu'}" supprime`);
        } else {
            setPendingDeleteId(locId);
            setTimeout(() => setPendingDeleteId(null), 3000);
        }
    };

    const handleDuplicateLocation = (e, locId, targetModelId, targetAccountId) => {
        e.stopPropagation();
        const updated = duplicateLocation(modelId, accountId, locId, targetModelId, targetAccountId);
        if (updated) {
            setAllModelsDatabase(updated);
            toast.success('Lieu duplique');
        }
    };

    const enterEditMode = (e, loc) => {
        e.stopPropagation();
        setLocFormMode(loc.id);
        setNewLocName(loc.name);
        setNewLocLighting(loc.default_lighting || '');
        setNewLocVibe(loc.default_vibe || '');
        setNewLocTimeOfDay(loc.time_of_day || '');
        setNewLocAnchorDetails(loc.anchor_details || '');
        setNewLocColorPalette(loc.color_palette || '');
        if (!presetEnvironmentsEN.includes(loc.environment)) {
            setIsCustomEnv(true);
            setNewLocEnvCustom(loc.environment);
        } else {
            setIsCustomEnv(false);
            setNewLocEnvDrop(loc.environment);
        }
        document.getElementById('loc-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setLocFormMode('create');
        setNewLocName('');
        setIsCustomEnv(false);
        setNewLocEnvCustom('');
        setNewLocEnvDrop(SCENE_OPTIONS.environment[0].promptEN);
        setNewLocLighting('');
        setNewLocVibe('');
        setNewLocTimeOfDay('');
        setNewLocAnchorDetails('');
        setNewLocColorPalette('');
    };

    const isEditing = locFormMode !== 'create';

    return (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

            {/* LEFT: LOCATIONS */}
            <div id="loc-scroll" className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto px-6 py-10">

                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Lieux & Decors</h2>
                        <p className="text-zinc-500 text-sm mt-1">Definissez des lieux precis pour garantir la coherence visuelle.</p>
                    </div>

                    {/* FORM */}
                    <div className={`rounded-xl border p-5 mb-10 transition-colors ${isEditing ? 'bg-amber-500/[0.03] border-amber-500/20' : 'bg-zinc-900/60 border-zinc-800/60'}`}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-sm font-semibold text-zinc-300">
                                {isEditing ? 'Modifier le lieu' : 'Nouveau lieu'}
                            </h3>
                            {isEditing && (
                                <button onClick={resetForm} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Nom du lieu</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Chambre, SDB Miroir..."
                                        className={inputClass}
                                        value={newLocName}
                                        onChange={(e) => setNewLocName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Environnement</span>
                                        <button
                                            onClick={() => setIsCustomEnv(!isCustomEnv)}
                                            className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${isCustomEnv ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}
                                        >
                                            {isCustomEnv ? 'Preset' : 'Custom'}
                                        </button>
                                    </div>
                                    {isCustomEnv ? (
                                        <textarea
                                            placeholder="Description detaillee en anglais..."
                                            value={newLocEnvCustom}
                                            onChange={(e) => setNewLocEnvCustom(e.target.value)}
                                            rows={2}
                                            className={inputClass + " resize-none"}
                                        />
                                    ) : (
                                        <select value={newLocEnvDrop} onChange={(e) => setNewLocEnvDrop(e.target.value)} className={selectClass}>
                                            {SCENE_OPTIONS.environment.map(env => (
                                                <option key={env.promptEN} value={env.promptEN}>{env.labelFR}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className={labelClass}>Eclairage</label>
                                    <select value={newLocLighting} onChange={(e) => setNewLocLighting(e.target.value)} className={selectClass}>
                                        <option value="">Libre</option>
                                        {SCENE_OPTIONS.lighting.map(l => (
                                            <option key={l.promptEN} value={l.promptEN}>{l.labelFR}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Vibe</label>
                                    <select value={newLocVibe} onChange={(e) => setNewLocVibe(e.target.value)} className={selectClass}>
                                        <option value="">Libre</option>
                                        {SCENE_OPTIONS.vibe.map(v => (
                                            <option key={v.promptEN} value={v.promptEN}>{v.labelFR}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Moment</label>
                                    <select value={newLocTimeOfDay} onChange={(e) => setNewLocTimeOfDay(e.target.value)} className={selectClass}>
                                        <option value="">Libre</option>
                                        {TIME_OF_DAY_OPTIONS.map(t => (
                                            <option key={t.promptEN} value={t.promptEN}>{t.labelFR}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Details d'ancrage <span className="text-amber-500/60 normal-case font-normal">coherence</span></label>
                                    <textarea
                                        placeholder="Objets recurrents: pink LED strip, grey duvet, cactus on nightstand..."
                                        value={newLocAnchorDetails}
                                        onChange={(e) => setNewLocAnchorDetails(e.target.value)}
                                        rows={3}
                                        className={inputClass + " resize-none font-mono text-[12px] leading-relaxed"}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Palette couleurs</label>
                                    <textarea
                                        placeholder="warm beige walls, white sheets, soft pink accents, dark wood..."
                                        value={newLocColorPalette}
                                        onChange={(e) => setNewLocColorPalette(e.target.value)}
                                        rows={3}
                                        className={inputClass + " resize-none font-mono text-[12px] leading-relaxed"}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSaveLocation}
                                    disabled={!newLocName.trim() || (isCustomEnv && !newLocEnvCustom.trim())}
                                    className={`h-9 px-5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 ${isEditing
                                            ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400'
                                            : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                                        }`}
                                >
                                    {isEditing ? 'Mettre a jour' : 'Enregistrer'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SAVED LOCATIONS */}
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Lieux enregistres</h3>

                    {(currentAccount.locations || []).length === 0 ? (
                        <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800">
                            <p className="text-zinc-500 text-sm">Aucun lieu. Creez-en un ci-dessus.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {currentAccount.locations.map(loc => (
                                <div
                                    key={loc.id}
                                    onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/${loc.id}/generate`)}
                                    className="group bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-700/60 transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2.5 mb-0.5">
                                                <h4 className="font-semibold text-zinc-100 text-sm truncate">{loc.name}</h4>
                                                <LockScore location={loc} />
                                            </div>
                                            <p className="text-[12px] text-zinc-500 mt-0.5 truncate">{loc.environment}</p>
                                        </div>
                                        <div className="flex gap-1 ml-3 shrink-0">
                                            {/* Duplicate dropdown */}
                                            {otherAccounts.length > 0 && (
                                                <div className="relative">
                                                    <select
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            if (!e.target.value) return;
                                                            const [tModelId, tAccountId] = e.target.value.split('::');
                                                            handleDuplicateLocation(e, loc.id, tModelId, tAccountId);
                                                            e.target.value = '';
                                                        }}
                                                        className="w-7 h-7 rounded-lg bg-transparent text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-xs appearance-none text-center outline-none hover:bg-zinc-700/50"
                                                        defaultValue=""
                                                        title="Dupliquer vers..."
                                                    >
                                                        <option value="" disabled>D</option>
                                                        {otherAccounts.map(oa => (
                                                            <option key={`${oa.modelId}::${oa.accountId}`} value={`${oa.modelId}::${oa.accountId}`}>
                                                                {oa.modelName} / {oa.handle}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => enterEditMode(e, loc)}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors opacity-0 group-hover:opacity-100 text-xs"
                                            >
                                                E
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteLocation(e, loc.id)}
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${pendingDeleteId === loc.id
                                                        ? 'bg-red-500/20 text-red-400 opacity-100'
                                                        : 'text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10'
                                                    }`}
                                            >
                                                {pendingDeleteId === loc.id ? '?' : '\u00D7'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {loc.seed && <span className="text-[10px] text-amber-400/70 bg-amber-500/8 px-2 py-0.5 rounded-md font-mono">🎲 {loc.seed}</span>}
                                        {loc.default_lighting && <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-md">Eclairage</span>}
                                        {loc.time_of_day && <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-md">Horaire</span>}
                                        {loc.anchor_details && <span className="text-[10px] text-amber-500/70 bg-amber-500/8 px-2 py-0.5 rounded-md">Ancrage</span>}
                                        {loc.color_palette && <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-md">Palette</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: SANDBOX */}
            <div className="lg:w-72 bg-zinc-950/50 border-t lg:border-t-0 lg:border-l border-zinc-800/50 p-6 lg:p-8 flex flex-col justify-center">
                <div className="max-w-xs mx-auto w-full">
                    <h3 className="text-base font-bold text-zinc-200 mb-2">Bac a sable</h3>
                    <p className="text-[13px] text-zinc-500 mb-8 leading-relaxed">
                        Mode libre pour du contenu ponctuel, sans creer de lieu.
                    </p>
                    <button
                        onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/sandbox/generate`)}
                        className="w-full h-11 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/10 active:scale-[0.98]"
                    >
                        Lancer le studio
                    </button>
                </div>
            </div>

        </div>
    );
};

export default LocationsAndSandboxView;
