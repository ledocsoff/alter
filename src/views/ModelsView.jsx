import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { deleteModelData, saveModelData, getLastSession, reorderModels } from '../utils/storage';
import ConfirmModal from '../features/ConfirmModal/ConfirmModal';
import { TrashIcon, CopyIcon, PlayIcon, SearchIcon, PlusIcon, UsersIcon, MapPinIcon, GripVerticalIcon } from '../components/Icons';

const MODEL_COLORS = [
  { gradient: 'from-violet-500 to-fuchsia-600', glow: 'shadow-violet-500/20', accent: 'violet' },
  { gradient: 'from-pink-500 to-rose-600', glow: 'shadow-pink-500/20', accent: 'pink' },
  { gradient: 'from-cyan-500 to-teal-600', glow: 'shadow-cyan-500/20', accent: 'cyan' },
  { gradient: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/20', accent: 'emerald' },
  { gradient: 'from-purple-500 to-violet-600', glow: 'shadow-purple-500/20', accent: 'purple' },
  { gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20', accent: 'amber' },
  { gradient: 'from-fuchsia-500 to-pink-600', glow: 'shadow-fuchsia-500/20', accent: 'fuchsia' },
];

const getModelColor = (index) => MODEL_COLORS[index % MODEL_COLORS.length];

const ModelsView = () => {
  const navigate = useNavigate();
  const { allModelsDatabase, setAllModelsDatabase, setModel } = useStudio();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOverItem.current = idx; setDragOverIdx(idx); };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const updated = reorderModels(dragItem.current, dragOverItem.current);
      if (updated) { setAllModelsDatabase(updated); toast.success('Ordre mis à jour'); }
    }
    dragItem.current = null; dragOverItem.current = null; setDragOverIdx(null);
  };

  const handleDelete = (e, model) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmDelete(model);
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    setAllModelsDatabase(deleteModelData(confirmDelete.id));
    toast.success(`${confirmDelete.name || 'Modèle'} supprimé`);
    setConfirmDelete(null);
  };

  const handleDuplicate = (e, m) => {
    e.stopPropagation();
    e.preventDefault();
    const { id, ...rest } = m;
    setAllModelsDatabase(saveModelData({ ...rest, name: `${m.name} (copie)`, accounts: [] }));
    toast.success(`"${m.name}" dupliqué`);
  };

  const filteredModels = useMemo(() => {
    if (!search.trim()) return allModelsDatabase;
    const q = search.toLowerCase();
    return allModelsDatabase.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.ethnicity?.toLowerCase().includes(q) ||
      m.hair?.color?.toLowerCase().includes(q) ||
      m.body?.type?.toLowerCase().includes(q)
    );
  }, [allModelsDatabase, search]);

  const handleSelect = (m) => {
    const { id, accounts, ...traits } = m;
    setModel({ ...traits, name: m.name });
    navigate(`/models/${id}/accounts`);
  };

  const lastSession = getLastSession();
  const hasResume = lastSession && allModelsDatabase.some(m => m.id === lastSession.modelId);
  const totalAccounts = allModelsDatabase.reduce((sum, m) => sum + (m.accounts?.length || 0), 0);
  const totalLocations = allModelsDatabase.reduce((sum, m) => sum + (m.accounts || []).reduce((s, a) => s + (a.locations?.length || 0), 0), 0);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Modèles</h2>
            <p className="text-zinc-500 text-sm mt-1">
              {allModelsDatabase.length > 0
                ? <>{allModelsDatabase.length} modèle{allModelsDatabase.length > 1 ? 's' : ''} · {totalAccounts} compte{totalAccounts > 1 ? 's' : ''} · {totalLocations} lieu{totalLocations > 1 ? 'x' : ''}</>
                : 'Créez votre premier profil pour commencer.'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasResume && (
              <button
                onClick={() => navigate(lastSession.path)}
                className="velvet-btn-primary flex items-center gap-2 h-9 text-xs"
                title={`Reprendre : ${lastSession.modelName} — ${lastSession.locationName}`}
              >
                <PlayIcon size={12} />
                <span>Reprendre</span>
                <span className="text-white/50 text-[10px]">({lastSession.modelName})</span>
              </button>
            )}
            {allModelsDatabase.length > 0 && (
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="velvet-input h-9 w-40 pl-8 text-sm"
                />
              </div>
            )}
            <button
              onClick={() => navigate('/models/new')}
              className="h-9 px-4 rounded-xl text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-all hover:shadow-lg hover:shadow-white/5 flex items-center gap-1.5"
            >
              <PlusIcon size={14} />
              Nouveau
            </button>
          </div>
        </div>

        {/* Empty state */}
        {allModelsDatabase.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-800/60 animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-4">
              <PlusIcon size={24} className="text-violet-400" />
            </div>
            <p className="text-zinc-300 font-semibold text-base mb-1">Aucun modèle</p>
            <p className="text-zinc-600 text-sm">Créez votre première influenceuse pour démarrer.</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-zinc-800/60 animate-fade-in">
            <p className="text-zinc-500 text-sm">Aucun résultat pour "{search}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 stagger-children">
            {filteredModels.map((m, idx) => {
              const globalIdx = allModelsDatabase.indexOf(m);
              const color = getModelColor(globalIdx);
              const accountCount = (m.accounts || []).length;
              const locationCount = (m.accounts || []).reduce((s, a) => s + (a.locations?.length || 0), 0);
              return (
                <div
                  key={m.id}
                  draggable={!search}
                  onDragStart={() => handleDragStart(globalIdx)}
                  onDragEnter={() => handleDragEnter(globalIdx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => handleSelect(m)}
                  className={`group relative flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-zinc-800/50 border ${dragOverIdx === globalIdx ? 'border-violet-500/50 bg-violet-500/5' : 'border-transparent hover:border-zinc-700/50'}`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Drag handle */}
                  {!search && (
                    <div className="shrink-0 cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 transition-colors" onMouseDown={(e) => e.stopPropagation()}>
                      <GripVerticalIcon size={14} />
                    </div>
                  )}
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg ${color.glow}`}>
                    {m.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-zinc-100 truncate">{m.name}</h3>
                      {m.ethnicity && <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">{(m.ethnicity || '').split(',')[0]}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                      <span>{m.age || '22'} ans</span>
                      {m.body?.type && <span>· {m.body.type}</span>}
                      {m.hair?.color && <span>· {(m.hair.color || '').split(',')[0]}</span>}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[11px] text-zinc-600 shrink-0">
                    <span className="flex items-center gap-1" title={`${accountCount} compte(s)`}>
                      <UsersIcon size={12} />
                      {accountCount}
                    </span>
                    <span className="flex items-center gap-1" title={`${locationCount} lieu(x)`}>
                      <MapPinIcon size={12} />
                      {locationCount}
                    </span>
                  </div>

                  {/* Action buttons — always visible */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleDuplicate(e, m)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                      title="Dupliquer"
                    >
                      <CopyIcon size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, m)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Supprimer"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Supprimer ce modèle ?"
        message={`"${confirmDelete?.name}" et tous ses comptes/lieux seront définitivement supprimés.`}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default ModelsView;
