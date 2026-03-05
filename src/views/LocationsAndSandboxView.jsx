import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { saveLocationData, deleteLocationData, duplicateLocationLocal, getLocationLockScore, generateSeed, getApiKey, reorderLocations, uploadLocationRefs } from '../utils/storage';
import { autoFillLocation } from '../utils/googleAI';
import { TrashIcon, CopyIcon, EditIcon, PlusIcon, MapPinIcon, SparklesIcon, ChevronRightIcon, GripVerticalIcon, CameraIcon } from '../components/Icons';

import ConfirmModal from '../features/ConfirmModal/ConfirmModal';
import LocationRefUpload from '../features/LocationRefUpload/LocationRefUpload';

// Extracted to a proper component so useState can be used legally (Rules of Hooks)
const LocationCard = ({ loc, idx, modelId, accountId, isGenerating, dragOverIdx, onDragStart, onDragEnter, onDragEnd, onEdit, onDuplicate, onDelete, navigate }) => {
    const [thumbFailed, setThumbFailed] = useState(false);
    const thumbUrl = loc.id ? `/api/location-refs/${encodeURIComponent(loc.id)}/first-image` : null;

    return (
        <div
            draggable={!isGenerating}
            onDragStart={() => onDragStart(idx)}
            onDragEnter={() => onDragEnter(idx)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`group flex items-center gap-0 rounded-xl border overflow-hidden transition-all duration-200 ${isGenerating
                ? 'border-teal-500/30 bg-teal-500/[0.02]'
                : dragOverIdx === idx
                    ? 'border-teal-500/40 bg-teal-500/5 scale-[1.005]'
                    : 'border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/60'
                }`}
        >
            {/* Thumbnail */}
            <div
                className="shrink-0 w-[72px] h-[72px] bg-zinc-900 flex items-center justify-center cursor-pointer relative overflow-hidden"
                onClick={() => !isGenerating && navigate(`/models/${modelId}/accounts/${accountId}/locations/${loc.id}/generate`)}
            >
                {!thumbFailed && thumbUrl ? (
                    <img
                        src={thumbUrl}
                        alt={loc.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setThumbFailed(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <MapPinIcon size={20} className="text-zinc-700" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                    <ChevronRightIcon size={16} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                </div>
            </div>

            {/* Separator */}
            <div className="w-px h-[72px] bg-zinc-800/60 shrink-0" />

            {/* Content */}
            <div className="flex-1 min-w-0 px-4 py-3 flex items-center gap-3">
                {!isGenerating && (
                    <div className="shrink-0 cursor-grab active:cursor-grabbing text-zinc-800 hover:text-zinc-500 transition-colors">
                        <GripVerticalIcon size={14} />
                    </div>
                )}
                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => !isGenerating && navigate(`/models/${modelId}/accounts/${accountId}/locations/${loc.id}/generate`)}
                >
                    <div className="flex items-center gap-2 mb-0.5">
                        {isGenerating && <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin shrink-0" />}
                        <span className="font-semibold text-zinc-100 text-[13px] truncate">{loc.name}</span>
                        {!isGenerating && <LockScore location={loc} />}
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate leading-relaxed">
                        {isGenerating ? <span className="text-teal-300">Génération en cours…</span> : loc.environment}
                    </p>
                </div>
                {!isGenerating && (
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-teal-400 hover:bg-teal-500/10 transition-all" title="Modifier">
                            <EditIcon size={13} />
                        </button>
                        <button onClick={onDuplicate} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-teal-400 hover:bg-teal-500/10 transition-all" title="Dupliquer">
                            <CopyIcon size={13} />
                        </button>
                        <button onClick={onDelete} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Supprimer">
                            <TrashIcon size={13} />
                        </button>
                        <div className="w-px h-4 bg-zinc-800 mx-1" />
                        <button
                            onClick={() => navigate(`/models/${modelId}/accounts/${accountId}/locations/${loc.id}/generate`)}
                            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-100 transition-colors text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06]"
                        >
                            Studio
                            <ChevronRightIcon size={11} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const LockScore = ({ location }) => {
    const { filled, total } = getLocationLockScore(location);
    const pct = Math.round((filled / total) * 100);
    const color = filled >= 5 ? 'bg-emerald-500' : filled >= 3 ? 'bg-teal-400' : 'bg-zinc-700';
    return (
        <div className="flex items-center gap-1.5" title={`Ancrage: ${pct}%`}>
            <div className="flex gap-[2px]">
                {Array.from({ length: total }, (_, i) => (
                    <div key={i} className={`w-1 h-3 rounded-sm transition-colors ${i < filled ? color : 'bg-zinc-800'}`} />
                ))}
            </div>
            <span className={`text-[10px] font-semibold tabular-nums ${filled >= 5 ? 'text-emerald-400/70' : filled >= 3 ? 'text-teal-400/70' : 'text-zinc-600'}`}>
                {pct}%
            </span>
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
    const [newLocEnv, setNewLocEnv] = useState('');
    const [newLocLighting, setNewLocLighting] = useState('');
    const [newLocVibe, setNewLocVibe] = useState('');
    const [newLocTimeOfDay, setNewLocTimeOfDay] = useState('');
    const [newLocAnchorDetails, setNewLocAnchorDetails] = useState('');
    const [newLocColorPalette, setNewLocColorPalette] = useState('');
    const [newLocNegativePrompt, setNewLocNegativePrompt] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [pendingLocPhotos, setPendingLocPhotos] = useState([]);
    const [generatingLocationId, setGeneratingLocationId] = useState(null);
    const pendingPhotosInputRef = useRef(null);
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
        return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Compte introuvable. <button onClick={() => navigate('/')} className="text-teal-400 ml-1.5 hover:underline font-medium">Retour</button></div>;
    }

    const safeStr = v => (typeof v === 'string' ? v : String(v || '')).trim();

    const handleSaveLocation = async () => {
        try {
            if (!newLocName.trim()) { toast.error('Nom du lieu requis'); return; }
            if (!newLocEnv.trim()) { toast.error('Environnement requis'); return; }

            const isCreating = locFormMode === 'create' || locFormMode === 'review';

            const locationData = {
                name: newLocName.trim(),
                environment: newLocEnv.trim(),
                default_lighting: newLocLighting,
                default_vibe: newLocVibe,
                time_of_day: newLocTimeOfDay,
                anchor_details: safeStr(newLocAnchorDetails),
                color_palette: safeStr(newLocColorPalette),
                negative_prompt: safeStr(newLocNegativePrompt),
            };
            if (!isCreating) locationData.id = locFormMode;

            const updated = saveLocationData(modelId, accountId, locationData);

            if (updated) {
                setAllModelsDatabase(updated);
                toast.success(isCreating ? `"${locationData.name}" créé` : `Lieu mis à jour`);
                resetForm();

                // Upload photos only if the user provided them — NO AI image generation fallback
                if (isCreating && pendingLocPhotos.length > 0) {
                    const savedModel = updated.find(m => m.id === modelId);
                    const savedAccount = savedModel?.accounts?.find(a => a.id === accountId);
                    const savedLoc = savedAccount?.locations?.find(l => l.name === locationData.name);

                    if (savedLoc) {
                        try {
                            await uploadLocationRefs(savedLoc.id, pendingLocPhotos.map(p => ({ base64: p.base64, mimeType: p.mimeType })));
                            toast.success(`${pendingLocPhotos.length} photo(s) du lieu sauvegardées`);
                        } catch { /* silent */ }
                        setPendingLocPhotos([]);
                    }
                }
            } else {
                toast.error('Erreur: impossible de sauvegarder');
            }
        } catch (err) {
            toast.error(`Erreur inattendue: ${err.message}`);
        }
    };

    const executeDeleteLocation = () => {
        if (!confirmDelete) return;
        const updated = deleteLocationData(modelId, accountId, confirmDelete.id);
        if (updated) setAllModelsDatabase(updated);
        if (locFormMode === confirmDelete.id) resetForm();
        toast.success(`"${confirmDelete.name || 'Lieu'}" supprimé`);
        setConfirmDelete(null);
    };

    const enterEditMode = (loc) => {
        setLocFormMode(loc.id);
        setNewLocName(loc.name);
        setNewLocEnv(loc.environment || '');
        setNewLocLighting(loc.default_lighting || '');
        setNewLocVibe(loc.default_vibe || '');
        setNewLocTimeOfDay(loc.time_of_day || '');
        setNewLocAnchorDetails(loc.anchor_details || '');
        setNewLocColorPalette(loc.color_palette || '');
        setNewLocNegativePrompt(loc.negative_prompt || '');
        document.getElementById('loc-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setLocFormMode('create');
        setNewLocName('');
        setNewLocEnv('');
        setNewLocLighting('');
        setNewLocVibe('');
        setNewLocTimeOfDay('');
        setNewLocAnchorDetails('');
        setNewLocColorPalette('');
        setNewLocNegativePrompt('');
        setPendingLocPhotos([]);
    };

    const isEditing = locFormMode !== 'create' && locFormMode !== 'review';

    const handleAutoFill = async () => {
        if (!newLocName.trim()) { toast.error('Entrez une description d\'abord'); return; }
        const apiKey = getApiKey();
        if (!apiKey) { toast.error('Clé API requise'); return; }
        setIsAutoFilling(true);
        try {
            const result = await autoFillLocation(apiKey, newLocName.trim());
            const str = v => Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v : String(v || ''));
            if (result.name) setNewLocName(str(result.name));
            if (result.environment) setNewLocEnv(str(result.environment));
            if (result.lighting) setNewLocLighting(str(result.lighting));
            if (result.vibe) setNewLocVibe(str(result.vibe));
            if (result.time_of_day) setNewLocTimeOfDay(str(result.time_of_day));
            if (result.anchor_details) setNewLocAnchorDetails(str(result.anchor_details));
            if (result.color_palette) setNewLocColorPalette(str(result.color_palette));
            if (result.negative_prompt) setNewLocNegativePrompt(str(result.negative_prompt));
            setLocFormMode('review');
            setNewLocName(str(result.name) || newLocName);
            toast.success('Lieu rempli par l\'IA — vérifie et enregistre');
        } catch (err) {
            toast.error(`Auto-fill échoué: ${err.message}`);
        } finally {
            setIsAutoFilling(false);
        }
    };

    const addPhotos = (files) => {
        const imgs = files.filter(f => f.type.startsWith('image/')).slice(0, 3 - pendingLocPhotos.length);
        Promise.all(imgs.map(f => new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res({ base64: reader.result.split(',')[1], mimeType: f.type, dataUrl: reader.result });
            reader.onerror = rej;
            reader.readAsDataURL(f);
        }))).then(loaded => setPendingLocPhotos(prev => [...prev, ...loaded].slice(0, 3)));
    };

    const locations = currentAccount.locations || [];

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* ── Top bar ── */}
                <div className="shrink-0 px-6 pt-7 pb-5 border-b border-zinc-800/40">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center">
                                        <MapPinIcon size={14} className="text-teal-400" />
                                    </span>
                                    Lieux &amp; Décors
                                </h2>
                                <p className="text-zinc-500 text-[13px] mt-1 ml-9">
                                    {locations.length} lieu{locations.length !== 1 ? 'x' : ''} enregistré{locations.length !== 1 ? 's' : ''}
                                    <span className="text-zinc-700 mx-2">·</span>
                                    Les ancres textuelles remplacent les images générées — plus rapide, même cohérence.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div id="loc-scroll" className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

                        {/* ── CREATION / EDIT FORM ── */}
                        <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isEditing
                            ? 'border-teal-500/25 bg-teal-500/[0.02]'
                            : 'border-zinc-800/60 bg-zinc-900/40'
                            }`}>
                            {/* Form header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isEditing ? 'bg-teal-500/20' : 'bg-zinc-800/60'}`}>
                                        {isEditing
                                            ? <EditIcon size={12} className="text-teal-400" />
                                            : <PlusIcon size={12} className="text-zinc-500" />
                                        }
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-200">
                                        {isEditing ? 'Modifier le lieu' : 'Nouveau lieu'}
                                    </span>
                                </div>
                                {(isEditing || locFormMode === 'review') && (
                                    <button onClick={resetForm} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800/50">
                                        Annuler
                                    </button>
                                )}
                            </div>

                            {/* ── STEP 1: Quick description + auto-fill ── */}
                            {!isEditing && locFormMode === 'create' && (
                                <div className="p-5 space-y-4">
                                    <div>
                                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2 block">
                                            Décris le lieu en quelques mots
                                        </label>
                                        <textarea
                                            placeholder="Ex: chambre cosy avec fairy lights et rideaux blancs • café parisien en terrasse • studio minimaliste..."
                                            className="velvet-input w-full resize-none text-[13px] leading-relaxed"
                                            value={newLocName}
                                            onChange={(e) => setNewLocName(e.target.value)}
                                            rows={2}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAutoFill(); }}
                                        />
                                    </div>

                                    {/* Photo drop zone */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <CameraIcon size={11} className="text-zinc-600" />
                                            Photos de référence
                                            <span className="font-normal normal-case text-zinc-700 text-[10px]">optionnel • max. 3</span>
                                        </label>
                                        <div
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${pendingLocPhotos.length > 0 ? 'border-teal-500/20 bg-teal-500/[0.02]' : 'border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/20'}`}
                                            onDrop={(e) => { e.preventDefault(); addPhotos(Array.from(e.dataTransfer.files)); }}
                                            onDragOver={(e) => e.preventDefault()}
                                        >
                                            {/* Thumbnails */}
                                            {pendingLocPhotos.map((img, idx) => (
                                                <div key={idx} className="relative group/thumb">
                                                    <img src={img.dataUrl} alt={`Photo de référence ${idx + 1}`} className="w-14 h-14 rounded-lg object-cover border border-white/[0.08]" />
                                                    <button
                                                        onClick={() => setPendingLocPhotos(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-red-500 hover:text-white hover:border-transparent text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all leading-none"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}

                                            {pendingLocPhotos.length < 3 && (
                                                <button
                                                    onClick={() => pendingPhotosInputRef.current?.click()}
                                                    className="w-14 h-14 rounded-lg border border-dashed border-zinc-700 hover:border-teal-500/40 bg-zinc-900/40 hover:bg-teal-500/[0.04] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                                                >
                                                    <CameraIcon size={14} className="text-zinc-600" />
                                                    <span className="text-[8px] text-zinc-700 font-medium">{pendingLocPhotos.length}/3</span>
                                                </button>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-zinc-500 leading-relaxed">
                                                    {pendingLocPhotos.length > 0
                                                        ? <><span className="text-teal-400 font-medium">{pendingLocPhotos.length} photo(s)</span> prête(s) · ancrage visuel fort</>
                                                        : <>Glisse des photos ici ou clique pour importer. <br /><span className="text-zinc-600">Sans photo, les métadonnées textuelles servent d'ancre.</span></>
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            ref={pendingPhotosInputRef}
                                            type="file" accept="image/*" multiple className="hidden"
                                            onChange={(e) => { addPhotos(Array.from(e.target.files)); e.target.value = ''; }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <p className="text-[11px] text-zinc-600">⌘ + Entrée pour lancer</p>
                                        <button
                                            onClick={handleAutoFill}
                                            disabled={isAutoFilling || !newLocName.trim()}
                                            className="velvet-btn-primary text-sm py-2.5 px-6 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isAutoFilling ? (
                                                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Analyse en cours...</>
                                            ) : (
                                                <><SparklesIcon size={14} />Créer avec l'IA</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 2: Full form (after AI fill or in edit mode) ── */}
                            {(isEditing || locFormMode === 'review') && (
                                <div className="p-5 space-y-5">
                                    {locFormMode === 'review' && (
                                        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                                            <div className="w-4 h-4 mt-0.5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                <span className="text-[8px] text-emerald-400 font-bold">✓</span>
                                            </div>
                                            <p className="text-[12px] text-emerald-300/80 leading-relaxed">
                                                Champs remplis par l'IA. Vérifiez et ajustez si besoin, puis enregistrez.
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Name */}
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2 block">Nom du lieu</label>
                                            <input
                                                type="text"
                                                placeholder="Chambre étudiante • Café terrasse • Studio..."
                                                className="velvet-input w-full font-medium"
                                                value={newLocName}
                                                onChange={(e) => setNewLocName(e.target.value)}
                                            />
                                        </div>

                                        {/* Environment */}
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2 block">
                                                Environnement <span className="text-teal-500/50 normal-case font-normal">· ancre principale</span>
                                            </label>
                                            <textarea
                                                placeholder="cozy bedroom with fairy lights, white sheets, warm tones..."
                                                value={newLocEnv}
                                                onChange={(e) => setNewLocEnv(e.target.value)}
                                                rows={2}
                                                className="velvet-input w-full resize-none leading-relaxed"
                                            />
                                        </div>

                                        {/* 3-column grid */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 block">Éclairage</label>
                                                <input type="text" placeholder="soft natural..." value={newLocLighting} onChange={(e) => setNewLocLighting(e.target.value)} className="velvet-input w-full text-[12px]" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 block">Vibe</label>
                                                <input type="text" placeholder="cozy, intimate..." value={newLocVibe} onChange={(e) => setNewLocVibe(e.target.value)} className="velvet-input w-full text-[12px]" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 block">Moment</label>
                                                <input type="text" placeholder="golden hour..." value={newLocTimeOfDay} onChange={(e) => setNewLocTimeOfDay(e.target.value)} className="velvet-input w-full text-[12px]" />
                                            </div>
                                        </div>

                                        {/* Anchor + Palette */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 block">
                                                    Détails d'ancrage <span className="text-teal-500/40 normal-case font-normal">cohérence</span>
                                                </label>
                                                <textarea
                                                    placeholder="pink LED strip, grey duvet, white IKEA lamp..."
                                                    value={newLocAnchorDetails}
                                                    onChange={(e) => setNewLocAnchorDetails(e.target.value)}
                                                    rows={2}
                                                    className="velvet-input w-full resize-none text-[12px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 block">Palette couleurs</label>
                                                <textarea
                                                    placeholder="warm beige, white sheets, soft pink..."
                                                    value={newLocColorPalette}
                                                    onChange={(e) => setNewLocColorPalette(e.target.value)}
                                                    rows={2}
                                                    className="velvet-input w-full resize-none text-[12px]"
                                                />
                                            </div>
                                        </div>

                                        {/* Negative */}
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 block">
                                                Negative prompt <span className="text-zinc-700 normal-case font-normal">éléments à exclure</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="tattoo, piercing, neon lights..."
                                                value={newLocNegativePrompt}
                                                onChange={(e) => setNewLocNegativePrompt(e.target.value)}
                                                className="velvet-input w-full text-[12px]"
                                            />
                                        </div>
                                    </div>

                                    {/* LOCATION REFERENCE PHOTOS (edit mode only — before the ID is known on creation) */}
                                    {isEditing && (
                                        <div>
                                            <label className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                                                <CameraIcon size={11} />Photos de référence
                                            </label>
                                            <LocationRefUpload locationId={locFormMode} />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/40">
                                        {locFormMode === 'review' && (
                                            <button onClick={resetForm} className="velvet-btn-ghost text-xs">Annuler</button>
                                        )}
                                        <button
                                            onClick={handleSaveLocation}
                                            disabled={!newLocName.trim() || !newLocEnv.trim()}
                                            className="h-10 px-6 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-teal-500 hover:bg-teal-400 text-white hover:shadow-lg hover:shadow-teal-500/20 active:scale-[0.98]"
                                        >
                                            {isEditing ? '✓ Mettre à jour' : '✓ Enregistrer le lieu'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── LOCATION LIST ── */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest">
                                    Lieux enregistrés <span className="text-zinc-700 ml-1">({locations.length})</span>
                                </h3>
                                {locations.length > 1 && (
                                    <span className="text-[10px] text-zinc-700">Glisser-déposer pour réordonner</span>
                                )}
                            </div>

                            {locations.length === 0 ? (
                                <div className="text-center py-20 rounded-2xl border border-dashed border-zinc-800/60">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                                        <MapPinIcon size={22} className="text-teal-400/50" />
                                    </div>
                                    <p className="text-zinc-400 font-semibold mb-1">Aucun lieu</p>
                                    <p className="text-zinc-600 text-sm">Créez votre premier lieu ci-dessus.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {locations.map((loc, idx) => (
                                        <LocationCard
                                            key={loc.id}
                                            loc={loc}
                                            idx={idx}
                                            modelId={modelId}
                                            accountId={accountId}
                                            isGenerating={generatingLocationId === loc.id}
                                            dragOverIdx={dragOverIdx}
                                            onDragStart={handleDragStart}
                                            onDragEnter={handleDragEnter}
                                            onDragEnd={handleDragEnd}
                                            onEdit={() => enterEditMode(loc)}
                                            onDuplicate={() => {
                                                const updated = duplicateLocationLocal(modelId, accountId, loc.id);
                                                if (updated) { setAllModelsDatabase(updated); toast.success('Lieu dupliqué'); }
                                            }}
                                            onDelete={() => setConfirmDelete(loc)}
                                            navigate={navigate}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
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
