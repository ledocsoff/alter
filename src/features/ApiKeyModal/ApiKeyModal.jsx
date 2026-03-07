import React, { useState, useEffect } from 'react';
import { getApiKey, saveApiKey, removeApiKey, getApiKey2, saveApiKey2, removeApiKey2 } from '../../utils/storage';
import { validateApiKey } from '../../utils/googleAI';

const ApiKeyModal = ({ isOpen, onClose }) => {
  const [key, setKey] = useState('');
  const [key2, setKey2] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showKey2, setShowKey2] = useState(false);
  const [status, setStatus] = useState('idle');
  const [status2, setStatus2] = useState('idle');
  const [error, setError] = useState('');
  const [error2, setError2] = useState('');

  useEffect(() => {
    if (isOpen) {
      const k = getApiKey();
      const k2 = getApiKey2();
      setKey(k);
      setKey2(k2);
      setStatus(k ? 'valid' : 'idle');
      setStatus2(k2 ? 'valid' : 'idle');
      setError('');
      setError2('');
    }
  }, [isOpen]);

  const handleSave = async (which) => {
    const isSecondary = which === 2;
    const currentKey = isSecondary ? key2 : key;
    const setCurrentStatus = isSecondary ? setStatus2 : setStatus;
    const setCurrentError = isSecondary ? setError2 : setError;
    const saveFn = isSecondary ? saveApiKey2 : saveApiKey;

    if (!currentKey.trim()) return;
    setCurrentStatus('validating');
    setCurrentError('');

    const result = await validateApiKey(currentKey.trim());
    if (result.valid) {
      saveFn(currentKey.trim());
      setCurrentStatus('valid');
      if (!isSecondary) setTimeout(() => onClose(true), 600);
    } else {
      setCurrentStatus('invalid');
      setCurrentError(result.error);
    }
  };

  const handleRemove = (which) => {
    if (which === 2) {
      removeApiKey2();
      setKey2('');
      setStatus2('idle');
      setError2('');
    } else {
      removeApiKey();
      setKey('');
      setStatus('idle');
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(false)} />
      <div className="relative bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-zinc-100">Configuration API</h3>
          <button onClick={() => onClose(false)} className="text-zinc-600 hover:text-zinc-300 text-lg transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>

        <p className="text-[12px] text-zinc-500 mb-4 leading-relaxed">
          Clé API <span className="text-teal-400 font-medium">Google AI Studio</span> — Obtenez-la sur{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">aistudio.google.com</a>
        </p>

        {/* PRIMARY KEY */}
        <KeyInputField
          label="Clé principale"
          value={key}
          showKey={showKey}
          status={status}
          error={error}
          onChange={(v) => { setKey(v); setStatus('idle'); setError(''); }}
          onToggleShow={() => setShowKey(!showKey)}
          onSave={() => handleSave(1)}
          onRemove={() => handleRemove(1)}
        />

        {/* SECONDARY KEY */}
        <div className="mt-4 pt-4 border-t border-zinc-800/40">
          <p className="text-[10px] text-zinc-600 mb-2">
            Clé secondaire (optionnelle) — utilisée automatiquement si le quota principal est atteint
          </p>
          <KeyInputField
            label="Clé de secours"
            value={key2}
            showKey={showKey2}
            status={status2}
            error={error2}
            onChange={(v) => { setKey2(v); setStatus2('idle'); setError2(''); }}
            onToggleShow={() => setShowKey2(!showKey2)}
            onSave={() => handleSave(2)}
            onRemove={() => handleRemove(2)}
            isSecondary
          />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-end mt-5 gap-2">
          <button
            onClick={() => onClose(false)}
            className="h-9 px-4 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={() => handleSave(1)}
            disabled={!key.trim() || status === 'validating'}
            className="alter-btn-primary h-9 px-5 text-sm disabled:opacity-30"
          >
            {status === 'validating' ? 'Vérification...' : 'Sauvegarder'}
          </button>
        </div>

        <p className="text-[10px] text-zinc-700 mt-4 text-center">
          Les clés sont stockées localement dans votre navigateur uniquement.
        </p>
      </div>
    </div>
  );
};

// ─── Reusable key input component ───

const KeyInputField = ({ label, value, showKey, status, error, onChange, onToggleShow, onSave, onRemove, isSecondary }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
      {value && (
        <button onClick={onRemove} className="text-[10px] text-zinc-700 hover:text-red-400 transition-colors">
          Supprimer
        </button>
      )}
    </div>
    <div className="relative">
      <input
        type={showKey ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="AIza..."
        className="w-full bg-zinc-950 border border-zinc-800/60 text-zinc-200 text-sm rounded-lg px-3 py-2.5 pr-24 outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700 font-mono"
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button onClick={onToggleShow} className="text-[10px] font-medium text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors">
          {showKey ? 'Masquer' : 'Voir'}
        </button>
        {isSecondary && value.trim() && (
          <button onClick={onSave} disabled={!value.trim()} className="text-[10px] font-medium text-emerald-600 hover:text-emerald-400 px-1.5 py-0.5 rounded transition-colors disabled:opacity-30">
            Valider
          </button>
        )}
      </div>
    </div>
    {error && (
      <div className="mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-[10px] text-red-400">{error}</p>
      </div>
    )}
    {status === 'valid' && value && (
      <div className="mt-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <p className="text-[10px] text-emerald-400">✓ Clé valide</p>
      </div>
    )}
  </div>
);

export default ApiKeyModal;
