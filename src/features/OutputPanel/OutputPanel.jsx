import React, { useState, useEffect, useCallback } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';
import { savePromptToHistory, getPromptHistory } from '../../utils/storage';
import { SCENE_OPTIONS, OUTFIT_PRESETS } from '../../constants/sceneOptions';

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const OutputPanel = ({ meta = {} }) => {
  const { generatedPrompt, scene, setScene } = useStudio();
  const toast = useToast();

  const [editedPrompt, setEditedPrompt] = useState(generatedPrompt);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(() => getPromptHistory());
  const [batchResults, setBatchResults] = useState(null);

  useEffect(() => {
    if (!isManuallyEdited) {
      setEditedPrompt(generatedPrompt);
    }
  }, [generatedPrompt, isManuallyEdited]);

  const handlePromptEdit = (value) => {
    setEditedPrompt(value);
    setIsManuallyEdited(true);
  };

  const handleRegenerate = () => {
    setEditedPrompt(generatedPrompt);
    setIsManuallyEdited(false);
    toast.info('Prompt regenere');
  };

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text || editedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);

      // Save to history on copy
      const updated = savePromptToHistory(text || editedPrompt, meta);
      setHistory(updated);
    } catch (err) {
      toast.error('Erreur de copie');
    }
  }, [editedPrompt, meta, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCopy]);

  // Batch generation: 5 variations
  const handleBatch = () => {
    try {
      const base = JSON.parse(generatedPrompt);
      const variations = Array.from({ length: 5 }, (_, i) => {
        const variant = { ...base };
        variant.outfit = pickRandom(OUTFIT_PRESETS).value;
        variant.scene = {
          ...variant.scene,
          pose: pickRandom(SCENE_OPTIONS.pose).promptEN,
          expression: pickRandom(SCENE_OPTIONS.expression).promptEN,
          vibe: pickRandom(SCENE_OPTIONS.vibe).promptEN,
        };
        variant._variant = i + 1;
        return variant;
      });
      setBatchResults(variations);
    } catch {
      toast.error('Erreur batch');
    }
  };

  const handleCopyBatch = async (variant, idx) => {
    try {
      const text = JSON.stringify(variant, null, 2);
      await navigator.clipboard.writeText(text);
      toast.success(`Variation ${idx + 1} copiée`);
      savePromptToHistory(text, { ...meta, variant: idx + 1 });
    } catch {
      toast.error('Erreur de copie');
    }
  };

  let isValidJSON = true;
  try { JSON.parse(editedPrompt); } catch { isValidJSON = false; }

  const lineCount = editedPrompt.split('\n').length;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex flex-col h-full overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Output</h2>
          <button
            onClick={() => { setShowHistory(!showHistory); setBatchResults(null); }}
            className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${showHistory ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Historique
          </button>
          <button
            onClick={() => { handleBatch(); setShowHistory(false); }}
            className="text-[10px] font-medium text-zinc-600 hover:text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-800/50 transition-colors"
          >
            Batch x5
          </button>
        </div>
        <div className="flex gap-1.5">
          {isManuallyEdited && (
            <button
              onClick={handleRegenerate}
              className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors text-violet-400 hover:bg-violet-500/8"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => handleCopy()}
            className={`text-[11px] px-3 py-1 rounded-md font-semibold transition-all ${copied
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-zinc-100 text-zinc-900 hover:bg-white'
              }`}
          >
            {copied ? 'Copie' : 'Copier'}
          </button>
        </div>
      </div>

      {/* HISTORY PANEL */}
      {showHistory && (
        <div className="mb-3 shrink-0 max-h-40 overflow-y-auto custom-scrollbar bg-zinc-950/80 border border-zinc-800/60 rounded-lg">
          {history.length === 0 ? (
            <p className="text-[11px] text-zinc-600 p-3">Aucun historique. Copiez un prompt pour le sauvegarder.</p>
          ) : (
            <div className="divide-y divide-zinc-800/40">
              {history.slice(0, 15).map(entry => (
                <div
                  key={entry.id}
                  onClick={() => { setEditedPrompt(entry.prompt); setIsManuallyEdited(true); setShowHistory(false); }}
                  className="px-3 py-2 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-medium truncate">{entry.modelName} - {entry.locationName}</span>
                    <span className="text-[10px] text-zinc-700 shrink-0 ml-2">{new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BATCH RESULTS */}
      {batchResults && (
        <div className="mb-3 shrink-0 max-h-44 overflow-y-auto custom-scrollbar bg-zinc-950/80 border border-zinc-800/60 rounded-lg p-2 space-y-1">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-medium text-zinc-400">5 variations générées</span>
            <button onClick={() => setBatchResults(null)} className="text-[10px] text-zinc-600 hover:text-zinc-300"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
          </div>
          {batchResults.map((v, i) => (
            <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800/40 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-semibold text-zinc-500 shrink-0">#{i + 1}</span>
                <span className="text-[11px] text-zinc-400 truncate">{v.outfit} · {v.scene.pose?.split(',')[0]}</span>
              </div>
              <button
                onClick={() => handleCopyBatch(v, i)}
                className="text-[10px] font-medium text-zinc-500 hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-zinc-700/50 transition-colors shrink-0"
              >
                Copier
              </button>
            </div>
          ))}
        </div>
      )}

      {/* JSON */}
      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          value={editedPrompt}
          onChange={(e) => handlePromptEdit(e.target.value)}
          spellCheck={false}
          className={`flex-1 w-full bg-zinc-950 border rounded-lg text-zinc-400 p-3 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-zinc-600 resize-none custom-scrollbar transition-colors ${isManuallyEdited
            ? isValidJSON ? 'border-violet-500/20' : 'border-red-500/30'
            : 'border-zinc-800/60'
            }`}
        />
        <div className="flex justify-between items-center mt-1.5 text-[10px] text-zinc-700">
          <span>{lineCount} lignes</span>
          <div className="flex gap-3">
            {isManuallyEdited && !isValidJSON && <span className="text-red-400/80">JSON invalide</span>}
            {isManuallyEdited && isValidJSON && <span className="text-violet-400/40">modifie</span>}
            <span className="text-zinc-800">Cmd+C copie</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutputPanel;
