import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { deleteModelData, saveModelData, getLastSession } from '../utils/storage';
import ConfirmModal from '../features/ConfirmModal/ConfirmModal';
import { TrashIcon, CopyIcon, PlayIcon, SearchIcon, PlusIcon, UsersIcon, MapPinIcon } from '../components/Icons';

const MODEL_COLORS = [
  { gradient: 'from-violet-500 to-fuchsia-600', glow: 'shadow-violet-500/20' },
  { gradient: 'from-pink-500 to-rose-600', glow: 'shadow-pink-500/20' },
  { gradient: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/20' },
  { gradient: 'from-cyan-500 to-teal-600', glow: 'shadow-cyan-500/20' },
  { gradient: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/20' },
  { gradient: 'from-purple-500 to-violet-600', glow: 'shadow-purple-500/20' },
  { gradient: 'from-fuchsia-500 to-pink-600', glow: 'shadow-fuchsia-500/20' },
];

const getModelColor = (index) => MODEL_COLORS[index % MODEL_COLORS.length];

const ModelsView = () => {
  const navigate = useNavigate();
  const { allModelsDatabase, setAllModelsDatabase, setModel } = useStudio();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');

  const handleDelete = (e, model) => {
    e.stopPropagation();
    setConfirmDelete(model);
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    setAllModelsDatabase(deleteModelData(confirmDelete.id));
    toast.success(`${confirmDelete.name || 'Modele'} supprime`);
    setConfirmDelete(null);
  };

  const handleDuplicate = (e, m) => {
    e.stopPropagation();
    const { id, ...rest } = m;
    setAllModelsDatabase(saveModelData({ ...rest, name: `${m.name} (copie)`, accounts: [] }));
    toast.success(`"${m.name}" duplique`);
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
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10 animate-fade-in">
          <div>
            <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">Modeles</h2>
            <p className="text-zinc-500 text-sm mt-1.5">
              {allModelsDatabase.length > 0
                ? <>{allModelsDatabase.length} modele{allModelsDatabase.length > 1 ? 's' : ''} · {totalAccounts} compte{totalAccounts > 1 ? 's' : ''} · {totalLocations} lieu{totalLocations > 1 ? 'x' : ''}</>
                : 'Creez votre premier profil pour commencer.'
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
                  className="velvet-input h-9 w-44 pl-8 text-sm"
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
          <div className="text-center py-28 rounded-2xl border border-dashed border-zinc-800/60 animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-5">
              <PlusIcon size={28} className="text-violet-400" />
            </div>
            <p className="text-zinc-300 font-semibold text-lg mb-1">Aucun modele</p>
            <p className="text-zinc-600 text-sm">Creez votre premiere influenceuse pour demarrer.</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800/60 animate-fade-in">
            <p className="text-zinc-500 text-sm">Aucun resultat pour "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filteredModels.map((m, idx) => {
              const globalIdx = allModelsDatabase.indexOf(m);
              const color = getModelColor(globalIdx);
              const accountCount = (m.accounts || []).length;
              const locationCount = (m.accounts || []).reduce((s, a) => s + (a.locations?.length || 0), 0);
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className="velvet-card-interactive group p-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center text-base font-bold text-white shrink-0 shadow-lg ${color.glow}`}>
                        {m.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="text-[15px] font-semibold text-zinc-100 leading-tight">{m.name}</h3>
                        <p className="text-[12px] text-zinc-500 mt-0.5">{m.age || '22'} ans · {m.body?.type || 'Standard'}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDuplicate(e, m)}
                        className="velvet-btn-delete"
                        title="Dupliquer"
                      >
                        <CopyIcon size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, m)}
                        className="velvet-btn-delete"
                        title="Supprimer"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {m.ethnicity && <span className="velvet-tag">{(m.ethnicity || '').split(',')[0]}</span>}
                      {m.hair?.color && <span className="velvet-tag">{(m.hair.color || '').split(',')[0]}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <UsersIcon size={11} />
                        {accountCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPinIcon size={11} />
                        {locationCount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Supprimer ce modele ?"
        message={`"${confirmDelete?.name}" et tous ses comptes/lieux seront definitivement supprimes.`}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default ModelsView;
