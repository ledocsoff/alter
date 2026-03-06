// v5.0.0 — CRUD buttons always visible, navigation separated
import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { saveAccountData, deleteAccountData, duplicateAccountData, reorderAccounts } from '../utils/storage';
import ConfirmModal from '../features/ConfirmModal/ConfirmModal';
import { PlusIcon, TrashIcon, CopyIcon, MapPinIcon, EditIcon, ChevronRightIcon, GripVerticalIcon } from '../components/Icons';

const PLATFORMS = {
  Instagram: { color: 'from-emerald-500 to-teal-600', accent: 'text-emerald-400' },
  TikTok: { color: 'from-cyan-400 to-blue-500', accent: 'text-cyan-400' },
  Tinder: { color: 'from-orange-500 to-rose-500', accent: 'text-rose-400' },
  OnlyFans: { color: 'from-sky-400 to-blue-600', accent: 'text-sky-400' },
};

const AccountsView = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const { allModelsDatabase, setAllModelsDatabase } = useStudio();
  const toast = useToast();

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOverItem.current = idx; setDragOverIdx(idx); };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const updated = reorderAccounts(modelId, dragItem.current, dragOverItem.current);
      if (updated) { setAllModelsDatabase(updated); toast.success('Ordre mis à jour'); }
    }
    dragItem.current = null; dragOverItem.current = null; setDragOverIdx(null);
  };

  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const currentModel = allModelsDatabase.find(m => m.id === modelId);

  if (!currentModel) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Modèle introuvable.
        <button onClick={() => navigate('/')} className="text-teal-400 ml-1.5 hover:underline font-medium">Retour</button>
      </div>
    );
  }

  const handleCreate = () => {
    const trimmed = handle.trim();
    if (!trimmed) return;
    if (trimmed.length > 30) { toast.error('Nom trop long (30 caracteres max)'); return; }
    const exists = (currentModel.accounts || []).some(
      a => a.handle.toLowerCase() === trimmed.toLowerCase() && a.platform === platform
    );
    if (exists) { toast.error('Ce compte existe deja'); return; }
    const updated = saveAccountData(modelId, { handle: trimmed, platform });
    if (updated) {
      setAllModelsDatabase(updated);
      setHandle('');
      toast.success(`Compte ${platform} ajouté`);
    }
  };

  const handleDuplicate = (accId) => {
    const updated = duplicateAccountData(modelId, accId);
    if (updated) {
      setAllModelsDatabase(updated);
      const acc = currentModel.accounts.find(a => a.id === accId);
      toast.success(`"${acc?.handle}" dupliqué`);
    }
  };

  const handleDelete = (acc) => {
    setConfirmDelete(acc);
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    const updated = deleteAccountData(modelId, confirmDelete.id);
    if (updated) setAllModelsDatabase(updated);
    toast.success(`${confirmDelete.handle || 'Compte'} supprimé`);
    setConfirmDelete(null);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-base sm:text-lg font-bold text-white shrink-0 shadow-lg shadow-teal-500/20">
                {currentModel.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight truncate">{currentModel.name}</h2>
                <p className="text-zinc-500 text-xs sm:text-[13px] mt-0.5 truncate">{currentModel.ethnicity?.split(',')[0]} · {currentModel.body?.type || 'Standard'}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/models/${modelId}/edit`)}
              className="velvet-btn-ghost text-xs flex items-center justify-center gap-1.5 py-2 sm:py-1 px-3 sm:px-2 w-full sm:w-auto"
            >
              <EditIcon size={12} />
              <span>Editer le profil</span>
            </button>
          </div>
        </div>

        {/* ADD FORM */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8 p-1.5 velvet-card rounded-xl animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center flex-1 bg-zinc-900/50 rounded-lg sm:bg-transparent sm:rounded-none px-1 py-1 sm:p-0 border border-zinc-800 sm:border-0">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="bg-transparent border-0 text-zinc-300 text-sm pl-3 pr-1 py-2 sm:py-0 outline-none focus:ring-0 cursor-pointer min-w-[100px]"
            >
              {Object.keys(PLATFORMS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="w-px h-5 bg-zinc-800 mx-1 hidden sm:block"></div>
            <input
              type="text"
              placeholder="@username"
              className="flex-1 bg-transparent text-zinc-100 text-sm px-3 py-2 outline-none placeholder-zinc-600 w-full"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!handle.trim()}
            className="h-10 sm:h-9 px-4 rounded-lg text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-all disabled:opacity-20 shrink-0 flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            <PlusIcon size={13} />
            Ajouter
          </button>
        </div>

        {/* LIST */}
        {(currentModel.accounts || []).length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-800/60 animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 flex items-center justify-center mx-auto mb-4">
              <PlusIcon size={24} className="text-emerald-400" />
            </div>
            <p className="text-zinc-300 font-semibold mb-1">Aucun compte</p>
            <p className="text-zinc-600 text-sm">Ajoutez un profil ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {currentModel.accounts.map((acc, idx) => {
              const cfg = PLATFORMS[acc.platform] || PLATFORMS.Instagram;
              const locCount = (acc.locations || []).length;
              return (
                <div
                  key={acc.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`velvet-card group px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${dragOverIdx === idx ? '!border-teal-500/50 bg-teal-500/5' : ''}`}
                >
                  {/* Left: clickable area for navigation */}
                  <div
                    className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/models/${modelId}/accounts/${acc.id}/locations`)}
                  >
                    {/* Drag handle */}
                    <div className="shrink-0 cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 transition-colors hidden sm:block" onClick={(e) => e.stopPropagation()}>
                      <GripVerticalIcon size={14} />
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0 shadow-md`}>
                      <span className="text-white text-sm font-bold">{acc.platform.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-zinc-100 text-[14px] leading-tight truncate">{acc.handle}</h4>
                      <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                        <span className={`text-[11px] ${cfg.accent} font-medium`}>{acc.platform}</span>
                        <span className="flex items-center gap-1 text-[11px] text-zinc-600 shrink-0">
                          <MapPinIcon size={10} />
                          {locCount} lieu{locCount !== 1 ? 'x' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: action buttons — SEPARATE from navigation */}
                  <div className="flex items-center justify-end w-full sm:w-auto gap-1.5 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-800/50 shrink-0">
                    <button
                      onClick={() => handleDuplicate(acc.id)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:text-teal-400 hover:bg-teal-500/10 transition-all"
                      title="Dupliquer"
                    >
                      <CopyIcon size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(acc)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Supprimer"
                    >
                      <TrashIcon size={15} />
                    </button>
                    <div className="w-px h-5 bg-zinc-800 mx-1" />
                    <button
                      onClick={() => navigate(`/models/${modelId}/accounts/${acc.id}/locations`)}
                      className="flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors text-[12px] font-medium px-2 py-1 rounded-lg hover:bg-white/[0.04]"
                    >
                      Ouvrir
                      <ChevronRightIcon size={14} />
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
        title="Supprimer ce compte ?"
        message={`"${confirmDelete?.handle}" et tous ses lieux seront définitivement supprimés.`}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default AccountsView;
