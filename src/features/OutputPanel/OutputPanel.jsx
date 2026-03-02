import React, { useState } from 'react';
import { useStudio } from '../../store/StudioContext';

const OutputPanel = () => {
  const { generatedPrompt, negativePrompt } = useStudio();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNeg, setCopiedNeg] = useState(false);

  const handleCopy = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Prompt Résultant</h2>
      <p className="text-gray-400 text-sm mb-6">Optimisé pour <span className="font-bold text-yellow-400">Nano Banana Pro</span> (Google AI Studio).</p>

      {/* PROMPT PRINCIPAL */}
      <div className="flex-1 flex flex-col mb-6 relative group">
        <label className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex justify-between items-center">
            <span>Description Générale (Prompt)</span>
            <button 
              onClick={() => handleCopy(generatedPrompt, setCopiedPrompt)}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${copiedPrompt ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
            >
              {copiedPrompt ? "✓ Copié !" : "Copier le Prompt"}
            </button>
        </label>
        <textarea
          readOnly
          value={generatedPrompt}
          className="flex-1 min-h-[350px] w-full bg-[#0a0a0a] border border-gray-700 rounded-xl text-gray-300 p-4 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none custom-scrollbar"
        />
      </div>

      {/* PROMPT NEGATIF */}
      <div className="h-48 flex flex-col relative group">
         <label className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide flex justify-between items-center">
            <span>Prompt Négatif (Recommandé)</span>
             <button 
              onClick={() => handleCopy(negativePrompt, setCopiedNeg)}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${copiedNeg ? 'bg-green-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'}`}
            >
              {copiedNeg ? "✓ Copié !" : "Copier Négatif"}
            </button>
        </label>
        <textarea
          readOnly
          value={negativePrompt}
          className="flex-1 w-full bg-red-950/10 border border-red-900/30 rounded-xl text-red-300/80 p-4 font-mono text-xs leading-relaxed focus:outline-none resize-none custom-scrollbar"
        />
      </div>
    </div>
  );
};

export default OutputPanel;
