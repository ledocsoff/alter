import React, { useState, useEffect } from 'react';
import { getApiKey, saveApiKey, removeApiKey } from '../../utils/storage';
import { validateApiKey } from '../../utils/googleAI';

const ApiKeyModal = ({ isOpen, onClose }) => {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | validating | valid | invalid
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKey(getApiKey());
      setStatus(getApiKey() ? 'valid' : 'idle');
      setError('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!key.trim()) return;
    setStatus('validating');
    setError('');

    const result = await validateApiKey(key.trim());
    if (result.valid) {
      saveApiKey(key.trim());
      setStatus('valid');
      setTimeout(() => onClose(true), 600);
    } else {
      setStatus('invalid');
      setError(result.error);
    }
  };

  const handleRemove = () => {
    removeApiKey();
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
          <h3 className="text-base font-bold text-zinc-100">Google AI Studio</h3>
          <button onClick={() => onClose(false)} className="text-zinc-600 hover:text-zinc-300 text-lg transition-colors">&times;</button>
        </div>

        <p className="text-[12px] text-zinc-500 mb-4 leading-relaxed">
          Collez votre cle API Google AI Studio pour generer des images directement dans l'app.
          Obtenez-la sur <span className="text-amber-500/70">aistudio.google.com</span>.
        </p>

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
