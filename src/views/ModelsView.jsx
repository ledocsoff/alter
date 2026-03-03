import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { deleteModelData, saveModelData } from '../utils/storage';

const MODEL_COLORS = [
  { from: 'from-amber-500', to: 'to-orange-600', shadow: 'shadow-amber-500/10', accent: 'text-amber-400' },
  { from: 'from-rose-500', to: 'to-pink-600', shadow: 'shadow-rose-500/10', accent: 'text-rose-400' },
  { from: 'from-violet-500', to: 'to-purple-600', shadow: 'shadow-violet-500/10', accent: 'text-violet-400' },
  { from: 'from-cyan-500', to: 'to-teal-600', shadow: 'shadow-cyan-500/10', accent: 'text-cyan-400' },
  { from: 'from-emerald-500', to: 'to-green-600', shadow: 'shadow-emerald-500/10', accent: 'text-emerald-400' },
  { from: 'from-blue-500', to: 'to-indigo-600', shadow: 'shadow-blue-500/10', accent: 'text-blue-400' },
  { from: 'from-fuchsia-500', to: 'to-pink-600', shadow: 'shadow-fuchsia-500/10', accent: 'text-fuchsia-400' },
];

const getModelColor = (index) => MODEL_COLORS[index % MODEL_COLORS.length];

const ModelsView = () => {
  const navigate = useNavigate();
  const { allModelsDatabase, setAllModelsDatabase, setModel } = useStudio();
  const toast = useToast();
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (pendingDeleteId === id) {
      const model = allModelsDatabase.find(m => m.id === id);
      setAllModelsDatabase(deleteModelData(id));
      setPendingDeleteId(null);
      toast.success(`${model?.name || 'Modele'} supprime`);
    } else {
      setPendingDeleteId(id);
      setTimeout(() => setPendingDeleteId(null), 3000);
    }
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

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Modeles</h2>
            <p className="text-zinc-500 text-sm mt-1">Selectionnez un profil pour commencer.</p>
          </div>
          <div className="flex items-center gap-2">
            {allModelsDatabase.length > 0 && (
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-44 bg-zinc-950 border border-zinc-800/60 text-zinc-300 text-sm rounded-lg px-3 outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700"
              />
            )}
            <button
              onClick={() => navigate('/models/new')}
              className="h-9 px-4 rounded-lg text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
            >
              + Nouveau
            </button>
          </div>
        </div>

        {allModelsDatabase.length === 0 ? (
          <div className="text-center py-28 rounded-2xl border border-dashed border-zinc-800">
            <div className="text-4xl mb-4 opacity-20">+</div>
            <p className="text-zinc-400 font-medium mb-1">Aucun modele</p>
            <p className="text-zinc-600 text-sm">Creez votre premiere influenceuse.</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800">
            <p className="text-zinc-500 text-sm">Aucun resultat pour "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredModels.map((m, idx) => {
              const globalIdx = allModelsDatabase.indexOf(m);
              const color = getModelColor(globalIdx);
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className="group relative bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-5 cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-700/60 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.from} ${color.to} flex items-center justify-center text-base font-bold text-white shrink-0 shadow-lg ${color.shadow}`}>
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
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors text-xs"
                      >
                        +
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, m.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${pendingDeleteId === m.id
                          ? 'bg-red-500/20 text-red-400'
                          : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                          }`}
                      >
                        {pendingDeleteId === m.id ? '?' : '\u00D7'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <span className="text-[11px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-md">{(m.ethnicity || '').split(',')[0]}</span>
                      <span className="text-[11px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-md">{(m.hair?.color || '').split(',')[0]}</span>
                    </div>
                    <span className="text-[11px] text-zinc-600">
                      {(m.accounts || []).length} compte{(m.accounts || []).length !== 1 ? 's' : ''}
                    </span>
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

export default ModelsView;
