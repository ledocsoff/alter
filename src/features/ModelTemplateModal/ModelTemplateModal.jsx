import React, { useState } from 'react';
import { MODEL_EXTRACTION_PROMPT } from '../../utils/googleAI';

// Reuse the single source of truth from googleAI.js
const TEMPLATE_PROMPT = MODEL_EXTRACTION_PROMPT;

const ModelTemplateModal = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(TEMPLATE_PROMPT);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = TEMPLATE_PROMPT;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700/60 rounded-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
                    <div>
                        <h2 className="text-base font-bold text-zinc-100">Template AI Studio</h2>
                        <p className="text-[12px] text-zinc-500 mt-0.5">
                            Copiez ce prompt, collez-le dans Google AI Studio avec une photo de la modèle.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="velvet-btn-delete"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {/* Prompt Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <pre className="text-[12px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed bg-zinc-950/60 rounded-xl p-5 border border-zinc-800/40">
                        {TEMPLATE_PROMPT}
                    </pre>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-zinc-800/60">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center">
                                <span className="text-[10px] text-blue-400">1</span>
                            </div>
                            <span className="text-[11px] text-zinc-500">Copier le prompt</span>
                        </div>
                        <span className="text-zinc-700">→</span>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center">
                                <span className="text-[10px] text-purple-400">2</span>
                            </div>
                            <span className="text-[11px] text-zinc-500">Coller dans AI Studio + photo</span>
                        </div>
                        <span className="text-zinc-700">→</span>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-[10px] text-emerald-400">3</span>
                            </div>
                            <span className="text-[11px] text-zinc-500">Coller le JSON ici</span>
                        </div>
                    </div>
                    <button
                        onClick={handleCopy}
                        className={`h-9 px-5 rounded-lg text-sm font-semibold transition-all ${copied
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                            }`}
                    >
                        {copied ? '✓ Copie !' : 'Copier le prompt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModelTemplateModal;
