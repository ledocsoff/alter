import React, { useState, useEffect } from 'react';
import { getApiKey, saveApiKey, removeApiKey, getApiProvider, saveApiProvider } from '../../utils/storage';
import { validateApiKey } from '../../utils/googleAI';

const PROVIDERS = [
  { id: 'ai_studio', label: 'Google AI Studio', desc: 'aistudio.google.com' },
  { id: 'vertex_ai', label: 'Google Cloud (GCP)', desc: 'console.cloud.google.com' },
];

const ApiKeyModal = ({ isOpen, onClose }) => {
  const [key, setKey] = useState('');
  const [provider, setProvider] = useState('ai_studio');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | validating | valid | invalid
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const p = getApiProvider();
      setProvider(p);
      const k = getApiKey(p);
      setKey(k);
      setStatus(k ? 'valid' : 'idle');
      setError('');
    }
  }, [isOpen]);

  // Quand on switch de provider, charger la clé correspondante
  const handleProviderChange = (p) => {
    setProvider(p);
    const k = getApiKey(p);
    setKey(k);
    setStatus(k ? 'valid' : 'idle');
    setError('');
  };

  const handleSave = async () => {
    if (!key.trim()) return;
    setStatus('validating');
    setError('');

    const result = await validateApiKey(key.trim());
    if (result.valid) {
      saveApiKey(key.trim(), provider);
      saveApiProvider(provider);
      setStatus('valid');
      setTimeout(() => onClose(true), 600);
    } else {
      setStatus('invalid');
      setError(result.error);
    }
  };

  const handleRemove = () => {
    removeApiKey(provider);
    setKey('');
    setStatus('idle');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(false)} />
      <div className="relative bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-zinc-100">Configuration API</h3>
          <button onClick={() => onClose(false)} className="text-zinc-600 hover:text-zinc-300 text-lg transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        <p className="text-[12px] text-zinc-500 mb-4 leading-relaxed">
          Deux cles API = deux quotas separes. Si l'une est saturee (503),
          basculez sur l'autre pour continuer a generer.
        </p>

        {/* PROVIDER SELECTOR */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Provider</label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderChange(p.id)}
                className={`relative text-left px-3 py-2.5 rounded-lg border transition-all duration-150 ${provider === p.id
                  ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-zinc-800/60 bg-zinc-950 hover:border-zinc-700'
                  }`}
              >
                <span className={`text-[12px] font-semibold block ${provider === p.id ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {p.label}
                </span>
                <span className="text-[10px] text-zinc-600 block mt-0.5">{p.desc}</span>
                {provider === p.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* API KEY INPUT */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Cle API</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => { setKey(e.target.value); setStatus('idle'); setError(''); }}
              placeholder="AIza..."
              className="w-full bg-zinc-950 border border-zinc-800/60 text-zinc-200 text-sm rounded-lg px-3 py-2.5 pr-16 outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors"
            >
              {showKey ? 'Masquer' : 'Voir'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        {status === 'valid' && (
          <div className="mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-[11px] text-emerald-400">Cle valide et sauvegardee</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={handleRemove}
            disabled={!key}
            className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-30"
          >
            Supprimer la cle
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onClose(false)}
              className="h-9 px-4 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!key.trim() || status === 'validating'}
              className="h-9 px-5 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-30"
            >
              {status === 'validating' ? 'Verification...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-zinc-700 mt-4 text-center">
          La cle est stockee localement dans votre navigateur uniquement.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyModal;
