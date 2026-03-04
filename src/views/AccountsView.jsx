import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { saveAccountData, deleteAccountData } from '../utils/storage';
import ConfirmModal from '../features/ConfirmModal/ConfirmModal';
import { TrashIcon, PlusIcon, ChevronRightIcon, MapPinIcon, EditIcon } from '../components/Icons';

const PLATFORMS = {
  Instagram: { color: 'from-fuchsia-500 to-purple-600', accent: 'text-fuchsia-400' },
  TikTok: { color: 'from-cyan-400 to-blue-500', accent: 'text-cyan-400' },
  Tinder: { color: 'from-orange-500 to-rose-500', accent: 'text-rose-400' },
  OnlyFans: { color: 'from-sky-400 to-blue-600', accent: 'text-sky-400' },
};

const AccountsView = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const { allModelsDatabase, setAllModelsDatabase } = useStudio();
  const toast = useToast();

  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const currentModel = allModelsDatabase.find(m => m.id === modelId);

  if (!currentModel) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Modele introuvable.
        <button onClick={() => navigate('/')} className="text-violet-400 ml-1.5 hover:underline font-medium">Retour</button>
      </div>
    );
  }

  const handleCreate = () => {
    if (!handle.trim()) return;
    const updated = saveAccountData(modelId, { handle: handle.trim(), platform });
    if (updated) {
      setAllModelsDatabase(updated);
      setHandle('');
      toast.success(`Compte ${platform} ajoute`);
    }
  };

  const handleDelete = (e, acc) => {
    e.stopPropagation();
    setConfirmDelete(acc);
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    const updated = deleteAccountData(modelId, confirmDelete.id);
    if (updated) setAllModelsDatabase(updated);
    toast.success(`${confirmDelete.handle || 'Compte'} supprime`);
    setConfirmDelete(null);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="mb-10 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg shadow-violet-500/20">
              {currentModel.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-zinc-100 tracking-tight">{currentModel.name}</h2>
                <button
                  onClick={() => navigate(`/models/${modelId}/edit`)}
                  className="velvet-btn-ghost text-xs flex items-center gap-1.5 py-1 px-2"
                >
                  <EditIcon size={12} />
                  Editer
                </button>
              </div>
              <p className="text-zinc-500 text-[13px] mt-0.5">{currentModel.ethnicity?.split(',')[0]} · {currentModel.body?.type || 'Standard'}</p>
            </div>
          </div>
        </div>

        {/* ADD FORM */}
        <div className="flex gap-2 mb-10 p-1.5 velvet-card rounded-xl animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-transparent border-0 text-zinc-300 text-sm pl-3 pr-1 outline-none focus:ring-0 cursor-pointer"
          >
            {Object.keys(PLATFORMS).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            type="text"
            placeholder="@username"
            className="flex-1 bg-transparent text-zinc-100 text-sm px-3 py-2 outline-none placeholder-zinc-600"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!handle.trim()}
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-all disabled:opacity-20 shrink-0 flex items-center gap-1.5"
          >
            <PlusIcon size={13} />
            Ajouter
          </button>
        </div>

        {/* GRID */}
        {(currentModel.accounts || []).length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-800/60 animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500/15 to-purple-500/15 flex items-center justify-center mx-auto mb-4">
              <PlusIcon size={24} className="text-fuchsia-400" />
            </div>
            <p className="text-zinc-300 font-semibold mb-1">Aucun compte</p>
            <p className="text-zinc-600 text-sm">Ajoutez un profil ci-dessus.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {currentModel.accounts.map(acc => {
              const cfg = PLATFORMS[acc.platform] || PLATFORMS.Instagram;
              const locCount = (acc.locations || []).length;
              return (
                <div
                  key={acc.id}
                  onClick={() => navigate(`/models/${modelId}/accounts/${acc.id}/locations`)}
                  className="velvet-card-interactive group p-5 cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0 shadow-md`}>
                        <span className="text-white text-sm font-bold">{acc.platform.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-100 text-sm leading-tight">{acc.handle}</h4>
                        <span className={`text-[11px] ${cfg.accent} font-medium`}>{acc.platform}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, acc)}
                      className="velvet-btn-delete opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 text-zinc-600">
                      <MapPinIcon size={12} />
                      {locCount} lieu{locCount !== 1 ? 'x' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-600 group-hover:text-zinc-300 transition-colors font-medium">
                      Ouvrir
                      <ChevronRightIcon size={14} />
                    </span>
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
        message={`"${confirmDelete?.handle}" et tous ses lieux seront definitivement supprimes.`}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default AccountsView;
