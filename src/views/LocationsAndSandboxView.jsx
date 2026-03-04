import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { saveLocationData, deleteLocationData, duplicateLocationLocal, getLocationLockScore, generateSeed, getApiKey, reorderLocations } from '../utils/storage';
import { autoFillLocation, generateLocationPresets } from '../utils/googleAI';
import { TrashIcon, CopyIcon, EditIcon, PlusIcon, MapPinIcon, SparklesIcon, ChevronRightIcon, GripVerticalIcon } from '../components/Icons';
import { SCENE_OPTIONS } from '../constants/sceneOptions';
import ConfirmModal from '../features/ConfirmModal/ConfirmModal';

const TIME_OF_DAY_OPTIONS = [
    { labelFR: "Matin (lumiere douce)", promptEN: "morning, soft early light" },
    { labelFR: "Apres-midi", promptEN: "afternoon, bright ambient light" },
    { labelFR: "Golden hour", promptEN: "golden hour, warm sunset light" },
    { labelFR: "Soiree / Nuit", promptEN: "evening, night time, artificial indoor lighting" },
    { labelFR: "Nuit club", promptEN: "late night, club atmosphere, colored lights" },
];

const LockScore = ({ location }) => {
    const { filled, total } = getLocationLockScore(location);
    const pct = Math.round((filled / total) * 100);
    return (
        <div className="flex items-center gap-1.5">
            <div className="flex gap-px">
                {Array.from({ length: total }, (_, i) => (
                    <div
                        key={i}
                        className={`w-1.5 h-3.5 rounded-sm transition-colors ${i < filled
                            ? filled >= 5 ? 'bg-emerald-500' : filled >= 3 ? 'bg-violet-400' : 'bg-zinc-600'
                            : 'bg-zinc-800/60'
                            }`}
                    />
                ))}
            </div>
            <span className={`text-[10px] font-semibold ${filled >= 5 ? 'text-emerald-400/80' : filled >= 3 ? 'text-violet-400/80' : 'text-zinc-600'
                }`}>{pct}%</span>
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
    const [newLocNegativePrompt, setNewLocNegativePrompt] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const handleDragStart = (idx) => { dragItem.current = idx; };
    const handleDragEnter = (idx) => { dragOverItem.current = idx; setDragOverIdx(idx); };
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const updated = reorderLocations(modelId, accountId, dragItem.current, dragOverItem.current);
            if (updated) { setAllModelsDatabase(updated); toast.success('Ordre mis à jour'); }
        }
        dragItem.current = null; dragOverItem.current = null; setDragOverIdx(null);
    };

    const currentModel = allModelsDatabase.find(m => m.id === modelId);
    const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);

    if (!currentModel || !currentAccount) {
        return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Compte introuvable. <button onClick={() => navigate('/')} className="text-violet-400 ml-1.5 hover:underline font-medium">Retour</button></div>;
    }


    const presetEnvironmentsEN = SCENE_OPTIONS.environment.map(env => env.promptEN);

    const handleSaveLocation = async () => {
        try {
            if (!newLocName.trim()) { toast.error('Nom du lieu requis'); return; }
            const finalEnvironment = newLocEnvCustom.trim() || newLocEnvDrop;
            if (!finalEnvironment) { toast.error('Environnement requis'); return; }

            const isCreating = locFormMode === 'create' || locFormMode === 'review' || locFormMode === 'manual';

            const locationData = {
                name: newLocName.trim(),
                environment: finalEnvironment,
                default_lighting: newLocLighting,
                default_vibe: newLocVibe,
                time_of_day: newLocTimeOfDay,
                anchor_details: newLocAnchorDetails.trim(),
                color_palette: newLocColorPalette.trim(),
                negative_prompt: newLocNegativePrompt.trim(),
            };
            if (!isCreating) locationData.id = locFormMode;

            const updated = saveLocationData(modelId, accountId, locationData);

            if (updated) {
                setAllModelsDatabase(updated);
                toast.success(isCreating ? `"${locationData.name}" créé` : `Lieu mis à jour`);
                resetForm();

                // Generate AI presets on CREATION only
                if (isCreating) {
                    const apiKey = getApiKey();
                    if (apiKey) {
                        setIsGeneratingPresets(true);
                        try {
                            const savedModel = updated.find(m => m.id === modelId);
                            const savedAccount = savedModel?.accounts?.find(a => a.id === accountId);
                            const savedLoc = savedAccount?.locations?.find(l => l.name === locationData.name);
                            if (savedLoc) {
                                const result = await generateLocationPresets(apiKey, savedLoc);
                                const updated2 = saveLocationData(modelId, accountId, { ...savedLoc, ai_presets: result.presets, ai_outfits: result.outfits, ai_poses: result.poses });
                                if (updated2) setAllModelsDatabase(updated2);
                                toast.success(`${result.presets.length} ambiances + ${result.outfits.length} tenues + ${result.poses.length} poses générées`);
                            }
                        } catch (err) {
                            toast.error(`Presets IA: ${err.message}`);
                        } finally {
                            setIsGeneratingPresets(false);
                        }
                    }
                }
            } else {
                toast.error('Erreur: impossible de sauvegarder');
            }
        } catch (err) {
            console.error('[SAVE] Unexpected error:', err);
            toast.error(`Erreur inattendue: ${err.message}`);
        }
    };

    const handleDeleteLocation = (e, loc) => {
        e.stopPropagation();
        setConfirmDelete(loc);
    };

    const executeDeleteLocation = () => {
        if (!confirmDelete) return;
        const updated = deleteLocationData(modelId, accountId, confirmDelete.id);
        if (updated) setAllModelsDatabase(updated);
        if (locFormMode === confirmDelete.id) resetForm();
        toast.success(`"${confirmDelete.name || 'Lieu'}" supprimé`);
        setConfirmDelete(null);
    };

    const handleDuplicateLocation = (e, locId) => {
        e.stopPropagation();
        e.preventDefault();
        const updated = duplicateLocationLocal(modelId, accountId, locId);
        if (updated) {
            setAllModelsDatabase(updated);
            toast.success('Lieu dupliqué');
        }
    };

    const enterEditMode = (loc) => {
        setLocFormMode(loc.id);
        setNewLocName(loc.name);
        setNewLocLighting(loc.default_lighting || '');
        setNewLocVibe(loc.default_vibe || '');
        setNewLocTimeOfDay(loc.time_of_day || '');
        setNewLocAnchorDetails(loc.anchor_details || '');
        setNewLocColorPalette(loc.color_palette || '');
        setNewLocNegativePrompt(loc.negative_prompt || '');
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
        setNewLocNegativePrompt('');
    };

    const isEditing = locFormMode !== 'create' && locFormMode !== 'review' && locFormMode !== 'manual';

    const handleAutoFill = async () => {
        if (!newLocName.trim()) { toast.error('Entrez une description d\'abord'); return; }
        const apiKey = getApiKey();
        if (!apiKey) { toast.error('Clé API requise'); return; }
        setIsAutoFilling(true);
        try {
            const result = await autoFillLocation(apiKey, newLocName.trim());
            const str = v => Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v : String(v || ''));
            if (result.name) setNewLocName(str(result.name));
            if (result.environment) { setIsCustomEnv(true); setNewLocEnvCustom(str(result.environment)); }
            if (result.lighting) setNewLocLighting(str(result.lighting));
            if (result.vibe) setNewLocVibe(str(result.vibe));
            if (result.time_of_day) setNewLocTimeOfDay(str(result.time_of_day));
            if (result.anchor_details) setNewLocAnchorDetails(str(result.anchor_details));
            if (result.color_palette) setNewLocColorPalette(str(result.color_palette));
            if (result.negative_prompt) setNewLocNegativePrompt(str(result.negative_prompt));
            setLocFormMode('review');
            toast.success('Lieu rempli par l\'IA — vérifie et enregistre');
        } catch (err) {
            toast.error(`Auto-fill échoué: ${err.message}`);
        } finally {
            setIsAutoFilling(false);
        }
    };

    return (
        <>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                {/* LEFT: LOCATIONS */}
                <div id="loc-scroll" className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto px-6 py-10">

                        <div className="mb-8 animate-fade-in">
                            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Lieux & Décors</h2>
                            <p className="text-zinc-500 text-sm mt-1.5">
                                {(currentAccount.locations || []).length} lieu{(currentAccount.locations || []).length !== 1 ? 'x' : ''} · Définissez des lieux précis pour la cohérence visuelle.
                            </p>
                        </div>

                        {/* FORM */}
                        <div className={`velvet-card rounded-xl p-5 mb-10 animate-fade-in-up transition-all ${isEditing ? '!border-violet-500/20 !bg-violet-500/[0.02]' : ''}`}>
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                    {isEditing ? (
                                        <><EditIcon size={14} className="text-violet-400" /> Modifier le lieu</>
                                    ) : (
                                        <><SparklesIcon size={14} className="text-violet-400" /> Nouveau lieu</>
                                    )}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {isEditing && (
                                        <button onClick={resetForm} className="velvet-btn-ghost text-xs">Annuler</button>
                                    )}
                                    {!isEditing && locFormMode === 'create' && newLocName.trim() && (
                                        <button onClick={() => { setIsCustomEnv(true); setLocFormMode('manual'); }} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
                                            Mode manuel →
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* STEP 1: AI DESCRIPTION INPUT (create mode only, before AI fill) */}
                            {!isEditing && locFormMode === 'create' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                                            Décris ton lieu en français
                                        </label>
                                        <textarea
                                            placeholder="Ex: ma chambre avec un lit défait et des fairy lights, un petit café parisien avec terrasse..."
                                            className="velvet-input w-full resize-none text-[13px]"
                                            value={newLocName}
                                            onChange={(e) => setNewLocName(e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleAutoFill}
                                            disabled={isAutoFilling || !newLocName.trim()}
                                            className={`velvet-btn-primary text-sm py-2.5 px-6 flex items-center gap-2 ${isAutoFilling ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                            {isAutoFilling ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                    Analyse en cours...
                                                </>
                                            ) : (
                                                <>
                                                    <SparklesIcon size={14} />
                                                    Créer avec l'IA
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: FULL FORM (pre-filled after AI or in edit/manual mode) */}
                            {(isEditing || locFormMode === 'manual' || locFormMode === 'review') && (
                                <div className="space-y-4">
                                    {locFormMode === 'review' && (
                                        <div className="p-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] mb-2">
                                            <p className="text-[12px] text-emerald-400 font-medium">✅ L'IA a rempli les champs ci-dessous. Vérifie et ajuste si besoin, puis enregistre.</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Nom du lieu</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Chambre Étudiante..."
                                                className="velvet-input w-full"
                                                value={newLocName}
                                                onChange={(e) => setNewLocName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Environnement</label>
                                            <textarea
                                                placeholder="Description détaillée en anglais..."
                                                value={newLocEnvCustom}
                                                onChange={(e) => setNewLocEnvCustom(e.target.value)}
                                                rows={2}
                                                className="velvet-input w-full resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Éclairage</label>
                                            <select value={newLocLighting} onChange={(e) => setNewLocLighting(e.target.value)} className="velvet-input w-full">
                                                <option value="">Libre</option>
                                                {SCENE_OPTIONS.lighting.map(l => (
                                                    <option key={l.promptEN} value={l.promptEN}>{l.labelFR}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Vibe</label>
                                            <select value={newLocVibe} onChange={(e) => setNewLocVibe(e.target.value)} className="velvet-input w-full">
                                                <option value="">Libre</option>
                                                {SCENE_OPTIONS.vibe.map(v => (
                                                    <option key={v.promptEN} value={v.promptEN}>{v.labelFR}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Moment</label>
                                            <select value={newLocTimeOfDay} onChange={(e) => setNewLocTimeOfDay(e.target.value)} className="velvet-input w-full">
                                                <option value="">Libre</option>
                                                {TIME_OF_DAY_OPTIONS.map(t => (
                                                    <option key={t.promptEN} value={t.promptEN}>{t.labelFR}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                                                Détails d'ancrage <span className="text-violet-400/60 normal-case font-normal">cohérence</span>
                                            </label>
                                            <textarea
                                                placeholder="Objets récurrents: pink LED strip, grey duvet, cactus on nightstand..."
                                                value={newLocAnchorDetails}
                                                onChange={(e) => setNewLocAnchorDetails(e.target.value)}
                                                rows={3}
                                                className="velvet-input w-full resize-none font-mono text-[12px] leading-relaxed"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Palette couleurs</label>
                                            <textarea
                                                placeholder="warm beige walls, white sheets, soft pink accents, dark wood..."
                                                value={newLocColorPalette}
                                                onChange={(e) => setNewLocColorPalette(e.target.value)}
                                                rows={3}
                                                className="velvet-input w-full resize-none font-mono text-[12px] leading-relaxed"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                                            Negative prompt <span className="text-zinc-600 normal-case font-normal">éléments à éviter</span>
                                        </label>
                                        <textarea
                                            placeholder="tattoo, piercing, neon lights, cluttered background..."
                                            value={newLocNegativePrompt}
                                            onChange={(e) => setNewLocNegativePrompt(e.target.value)}
                                            rows={2}
                                            className="velvet-input w-full resize-none font-mono text-[12px] leading-relaxed"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        {(locFormMode === 'review' || locFormMode === 'manual') && (
                                            <button onClick={resetForm} className="velvet-btn-ghost text-xs">Annuler</button>
                                        )}
                                        <button
                                            onClick={handleSaveLocation}
                                            disabled={!newLocName.trim() || !newLocEnvCustom.trim()}
                                            className={`h-10 px-5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 ${isEditing
                                                ? 'bg-violet-500 text-white hover:bg-violet-400 hover:shadow-lg hover:shadow-violet-500/20'
                                                : 'velvet-btn-primary'
                                                }`}
                                        >
                                            {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AI PRESETS LOADER */}
                        {isGeneratingPresets && (
                            <div className="mb-6 p-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.03] animate-fade-in-up">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                    <div>
                                        <p className="text-sm font-semibold text-violet-300">Génération des ambiances IA...</p>
                                        <p className="text-[11px] text-zinc-500">8 presets adaptés à ce lieu seront créés automatiquement</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SAVED LOCATIONS */}
                        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                            Lieux enregistrés ({(currentAccount.locations || []).length})
                        </h3>

                        {(currentAccount.locations || []).length === 0 ? (
                            <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800/60 animate-fade-in-up">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 flex items-center justify-center mx-auto mb-4">
                                    <MapPinIcon size={24} className="text-violet-400" />
                                </div>
                                <p className="text-zinc-300 font-semibold mb-1">Aucun lieu</p>
                                <p className="text-zinc-600 text-sm">Créez-en un ci-dessus.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 stagger-children">
                                {currentAccount.locations.map((loc, idx) => (
                                    <div
                                        key={loc.id}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragEnter={() => handleDragEnter(idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => e.preventDefault()}
                                        className={`velvet-card group p-4 ${dragOverIdx === idx ? '!border-violet-500/50 bg-violet-500/5' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Drag handle */}
                                            <div className="shrink-0 cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 transition-colors">
                                                <GripVerticalIcon size={14} />
                                            </div>
                                            {/* Left: clickable area for navigation */}
                                            <div
                                                className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/${loc.id}/generate`)}
                                            >
                                                <div className="flex items-center gap-2.5 mb-0.5">
                                                    <MapPinIcon size={14} className="text-violet-400 shrink-0" />
                                                    <h4 className="font-semibold text-zinc-100 text-sm truncate">{loc.name}</h4>
                                                    <LockScore location={loc} />
                                                </div>
                                                <p className="text-[12px] text-zinc-500 mt-0.5 truncate pl-[22px]">{loc.environment}</p>
                                            </div>

                                            {/* Right: action buttons — SEPARATE from navigation */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => enterEditMode(loc)}
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                                                    title="Modifier"
                                                >
                                                    <EditIcon size={15} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const updated = duplicateLocationLocal(modelId, accountId, loc.id);
                                                        if (updated) {
                                                            setAllModelsDatabase(updated);
                                                            toast.success('Lieu dupliqué');
                                                        }
                                                    }}
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                                                    title="Dupliquer"
                                                >
                                                    <CopyIcon size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(loc)}
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                    title="Supprimer"
                                                >
                                                    <TrashIcon size={15} />
                                                </button>
                                                <div className="w-px h-5 bg-zinc-800 mx-1" />
                                                <button
                                                    onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/${loc.id}/generate`)}
                                                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors text-[12px] font-medium px-2 py-1 rounded-lg hover:bg-white/[0.04]"
                                                >
                                                    Studio
                                                    <ChevronRightIcon size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pl-[22px] mt-2">
                                            {loc.seed && <span className="velvet-tag !text-violet-400/70 !bg-violet-500/8 !border-violet-500/10 font-mono">Seed {loc.seed}</span>}
                                            {loc.ai_presets?.length > 0 && <span className="velvet-tag !text-emerald-400/70 !bg-emerald-500/8 !border-emerald-500/10">IA ✓ {loc.ai_presets.length} ambiances</span>}
                                            {loc.default_lighting && <span className="velvet-tag">Eclairage</span>}
                                            {loc.time_of_day && <span className="velvet-tag">Horaire</span>}
                                            {loc.anchor_details && <span className="velvet-tag !text-emerald-400/70 !bg-emerald-500/8 !border-emerald-500/10">Ancrage</span>}
                                            {loc.color_palette && <span className="velvet-tag">Palette</span>}
                                            {loc.negative_prompt && <span className="velvet-tag !text-red-400/70 !bg-red-500/8 !border-red-500/10">Neg prompt</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: SANDBOX */}
                <div className="lg:w-72 bg-[#0a0a0c] border-t lg:border-t-0 lg:border-l border-white/[0.04] p-6 lg:p-8 flex flex-col justify-center">
                    <div className="max-w-xs mx-auto w-full">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
                            <SparklesIcon size={22} className="text-violet-400" />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-200 mb-2">Bac a sable</h3>
                        <p className="text-[13px] text-zinc-500 mb-8 leading-relaxed">
                            Mode libre pour du contenu ponctuel, sans creer de lieu.
                        </p>
                        <button
                            onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/sandbox/generate`)}
                            className="velvet-btn-primary w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                        >
                            <SparklesIcon size={14} />
                            Lancer le studio
                        </button>
                    </div>
                </div>

            </div>
            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Supprimer ce lieu ?"
                message={`"${confirmDelete?.name}" sera définitivement supprimé.`}
                onConfirm={executeDeleteLocation}
                onCancel={() => setConfirmDelete(null)}
            />
        </>
    );
};

export default LocationsAndSandboxView;
