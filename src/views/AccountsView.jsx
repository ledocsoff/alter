import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { saveAccountData, deleteAccountData } from '../utils/storage';

const PLATFORMS = {
  Instagram: { color: 'from-fuchsia-500 to-purple-600', accent: 'text-fuchsia-400', bg: 'bg-fuchsia-500/8' },
  TikTok:    { color: 'from-cyan-400 to-blue-500',      accent: 'text-cyan-400',    bg: 'bg-cyan-500/8' },
  Tinder:    { color: 'from-orange-500 to-rose-500',     accent: 'text-rose-400',    bg: 'bg-rose-500/8' },
  OnlyFans:  { color: 'from-sky-400 to-blue-600',        accent: 'text-sky-400',     bg: 'bg-sky-500/8' },
};

const AccountsView = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const { allModelsDatabase, setAllModelsDatabase } = useStudio();
  const toast = useToast();

  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const currentModel = allModelsDatabase.find(m => m.id === modelId);

  if (!currentModel) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Modele introuvable. <button onClick={() => navigate('/')} className="text-amber-500 ml-1 underline">Retour</button></div>;
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

  const handleDelete = (e, accountId) => {
    e.stopPropagation();
    if (pendingDeleteId === accountId) {
      const acc = currentModel.accounts.find(a => a.id === accountId);
      const updated = deleteAccountData(modelId, accountId);
      if (updated) setAllModelsDatabase(updated);
      setPendingDeleteId(null);
      toast.success(`${acc?.handle || 'Compte'} supprime`);
    } else {
      setPendingDeleteId(accountId);
      setTimeout(() => setPendingDeleteId(null), 3000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg shadow-amber-500/10">
              {currentModel.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-zinc-100 tracking-tight">{currentModel.name}</h2>
                <button onClick={() => navigate(`/models/${modelId}/edit`)} className="text-zinc-600 hover:text-zinc-300 text-xs transition-colors">Editer</button>
              </div>
              <p className="text-zinc-500 text-[13px] mt-0.5">{currentModel.ethnicity?.split(',')[0]} · {currentModel.body?.type || 'Standard'}</p>
            </div>
          </div>
        </div>

        {/* ADD FORM */}
        <div className="flex gap-2 mb-10 p-1.5 bg-zinc-900/80 border border-zinc-800/60 rounded-xl">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-transparent border-0 text-zinc-300 text-sm pl-3 pr-1 outline-none focus:ring-0"
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
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-20 shrink-0"
          >
            Ajouter
          </button>
        </div>

        {/* GRID */}
        {(currentModel.accounts || []).length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-800">
            <p className="text-zinc-400 font-medium mb-1">Aucun compte</p>
            <p className="text-zinc-600 text-sm">Ajoutez un profil ci-dessus.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentModel.accounts.map(acc => {
              const cfg = PLATFORMS[acc.platform] || PLATFORMS.Instagram;
              return (
                <div
                  key={acc.id}
                  onClick={() => navigate(`/models/${modelId}/accounts/${acc.id}/locations`)}
                  className="group bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-5 cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-700/60 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0 shadow-sm`}>
                        <span className="text-white text-xs font-bold">{acc.platform.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-100 text-sm leading-tight">{acc.handle}</h4>
                        <span className={`text-[11px] ${cfg.accent} font-medium`}>{acc.platform}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, acc.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                        pendingDeleteId === acc.id
                          ? 'bg-red-500/20 text-red-400 opacity-100'
                          : 'text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10'
                      }`}
                    >
                      {pendingDeleteId === acc.id ? '?' : '\u00D7'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-zinc-600">{(acc.locations || []).length} lieu{(acc.locations || []).length !== 1 ? 'x' : ''}</span>
                    <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors font-medium">Ouvrir &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsView;
