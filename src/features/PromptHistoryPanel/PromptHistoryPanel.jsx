import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '../../store/ToastContext';
import { getPromptHistory, clearPromptHistory } from '../../utils/storage';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { FileTextIcon } from '../../components/Icons';

const PromptHistoryPanel = ({ onReuse, generatedPrompt }) => {
    const toast = useToast();
    const [history, setHistory] = useState(() => getPromptHistory());
    const [search, setSearch] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);
    const [confirmReuse, setConfirmReuse] = useState(null);
    const [activeTab, setActiveTab] = useState('prompt');

    // Refresh history when switching to history tab
    useEffect(() => {
        if (activeTab === 'history') setHistory(getPromptHistory());
    }, [activeTab]);

    const filtered = useMemo(() => {
        if (!search.trim()) return history;
        const q = search.toLowerCase();
        return history.filter(h =>
            h.modelName?.toLowerCase().includes(q) ||
            h.locationName?.toLowerCase().includes(q) ||
            h.prompt?.toLowerCase().includes(q)
        );
    }, [history, search]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copié');
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMin = Math.floor((now - d) / 60000);
        if (diffMin < 1) return 'À l\'instant';
        if (diffMin < 60) return `${diffMin}min`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const truncatePrompt = (prompt) => {
        try {
            const obj = JSON.parse(prompt);
            const env = obj.environment?.setting || '';
            const pose = obj.pose?.body_position || '';
            const outfit = obj.subject?.apparel || '';
            return [env, pose, outfit].filter(Boolean).join(' · ').slice(0, 80) || prompt.slice(0, 80);
        } catch {
            return prompt.slice(0, 80);
        }
    };

    const galleryImageUrl = (id) => id ? `/api/gallery/${encodeURIComponent(id)}/image` : null;

    // Determine success for old entries (no field) vs new ones
    const isSuccess = (entry) => entry.success !== false;

    return (
        <>
            <div className="h-full flex flex-col overflow-hidden">
                {/* Sub-tabs */}
                <div className="shrink-0 flex items-center border-b border-zinc-800/40">
                    <button
                        onClick={() => setActiveTab('prompt')}
                        className={`flex-1 text-[11px] font-semibold py-2 text-center transition-colors border-b-2 ${activeTab === 'prompt' ? 'text-zinc-200 border-teal-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                    >
                        Prompt actuel
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 text-[11px] font-semibold py-2 text-center transition-colors border-b-2 ${activeTab === 'history' ? 'text-zinc-200 border-teal-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                    >
                        Historique
                        {history.length > 0 && <span className="ml-1 text-[9px] text-zinc-600">({history.length})</span>}
                    </button>
                </div>

                {/* ─── PROMPT ACTUEL ─── */}
                {activeTab === 'prompt' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {generatedPrompt ? (
                            <>
                                <div className="shrink-0 px-3 py-2 border-b border-zinc-800/30 flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-zinc-400">Prompt JSON envoyé à Gemini</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-zinc-700 font-mono">{generatedPrompt.length} chars</span>
                                        <button
                                            onClick={() => handleCopy(generatedPrompt)}
                                            className="text-[9px] text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition-colors"
                                        >
                                            📋 Copier
                                        </button>
                                    </div>
                                </div>
                                <pre className="flex-1 overflow-auto custom-scrollbar px-3 py-2.5 text-[10px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                                    {generatedPrompt}
                                </pre>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center px-6">
                                    <div className="text-2xl mb-2 opacity-20">📝</div>
                                    <p className="text-zinc-500 text-[12px] font-medium">Aucun prompt</p>
                                    <p className="text-zinc-700 text-[11px] mt-0.5">Discutez avec le Directeur Photo pour générer un prompt</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── HISTORIQUE ─── */}
                {activeTab === 'history' && (
                    <>
                        {/* History Header */}
                        <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800/40">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-zinc-500">{history.length} prompt{history.length !== 1 ? 's' : ''}</span>
                                {history.length > 0 && (
                                    <span className="text-[9px] text-zinc-700">
                                        {history.filter(h => isSuccess(h)).length} ✓ · {history.filter(h => !isSuccess(h)).length} ✗
                                    </span>
                                )}
                            </div>
                            {history.length > 0 && (
                                <button
                                    onClick={() => setConfirmClear(true)}
                                    className="text-[10px] text-zinc-600 hover:text-red-400 px-1.5 py-0.5 rounded-md hover:bg-red-500/10 transition-colors"
                                >
                                    Vider
                                </button>
                            )}
                        </div>

                        {/* Search */}
                        {history.length > 3 && (
                            <div className="shrink-0 px-3 py-1.5 border-b border-zinc-800/20">
                                <input
                                    type="text"
                                    placeholder="Filtrer..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="velvet-input w-full text-[11px] px-2.5 py-1"
                                />
                            </div>
                        )}

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filtered.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="mb-2 opacity-20"><FileTextIcon size={28} /></div>
                                        <p className="text-zinc-500 text-[12px] font-medium">Aucun historique</p>
                                        <p className="text-zinc-700 text-[11px] mt-0.5">Les prompts générés apparaîtront ici</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800/30">
                                    {filtered.map(entry => {
                                        const imgUrl = galleryImageUrl(entry.galleryImageId);
                                        const success = isSuccess(entry);

                                        return (
                                            <div
                                                key={entry.id}
                                                className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-zinc-800/20 transition-colors cursor-pointer group ${!success ? 'opacity-70' : ''}`}
                                                onClick={() => setConfirmReuse({ id: entry.id, prompt: entry.prompt })}
                                            >
                                                {/* Status dot + Image thumbnail */}
                                                <div className="shrink-0 relative">
                                                    <div className={`w-10 h-10 rounded-lg overflow-hidden border ${success ? 'border-emerald-500/20 bg-zinc-900' : 'border-red-500/20 bg-red-950/30'}`}>
                                                        {imgUrl && success ? (
                                                            <img
                                                                src={imgUrl}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex'); }}
                                                            />
                                                        ) : null}
                                                        {/* Fallback / error icon */}
                                                        {(!imgUrl || !success) && (
                                                            <div className={`w-full h-full flex items-center justify-center ${success ? 'bg-gradient-to-br from-emerald-500/5 to-zinc-900' : 'bg-gradient-to-br from-red-500/10 to-zinc-900'}`}>
                                                                <span className="text-sm">{success ? '✓' : '✗'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Status indicator dot */}
                                                    <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0c] ${success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        {entry.locationName && (
                                                            <span className="text-[9px] text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">{entry.locationName}</span>
                                                        )}
                                                        {!success && (
                                                            <span className="text-[9px] text-red-400/60 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">Échec</span>
                                                        )}
                                                        <span className="text-[9px] text-zinc-700 ml-auto shrink-0">{formatTime(entry.timestamp)}</span>
                                                    </div>
                                                    <p className={`text-[10px] truncate transition-colors ${success ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-red-400/50 group-hover:text-red-300/70'}`}>
                                                        {!success && entry.errorMessage ? entry.errorMessage : truncatePrompt(entry.prompt)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Confirm Clear Modal */}
            <ConfirmModal
                isOpen={confirmClear}
                title="Vider l'historique ?"
                message="Tous les prompts seront définitivement supprimés."
                confirmLabel="Vider"
                onConfirm={() => { setHistory(clearPromptHistory()); setConfirmClear(false); toast.success('Historique vidé'); }}
                onCancel={() => setConfirmClear(false)}
            />

            {/* Confirm Reuse Modal */}
            <ConfirmModal
                isOpen={!!confirmReuse}
                title="Recharger ce prompt ?"
                message="Le prompt actuel sera remplacé par celui sélectionné. L'image sera régénérée avec ce prompt."
                confirmLabel="Recharger"
                onConfirm={() => {
                    if (confirmReuse && onReuse) {
                        onReuse(confirmReuse.prompt);
                        toast.info('Prompt rechargé');
                    }
                    setConfirmReuse(null);
                }}
                onCancel={() => setConfirmReuse(null)}
            />
        </>
    );
};

export default PromptHistoryPanel;
