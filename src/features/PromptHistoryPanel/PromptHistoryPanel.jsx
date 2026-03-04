import React, { useState, useMemo } from 'react';
import { useToast } from '../../store/ToastContext';
import { getPromptHistory, clearPromptHistory } from '../../utils/storage';
import ConfirmModal from '../ConfirmModal/ConfirmModal';

const PromptHistoryPanel = ({ onReuse }) => {
    const toast = useToast();
    const [history, setHistory] = useState(() => getPromptHistory());
    const [expandedId, setExpandedId] = useState(null);
    const [search, setSearch] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);

    const filtered = useMemo(() => {
        if (!search.trim()) return history;
        const q = search.toLowerCase();
        return history.filter(h =>
            h.modelName?.toLowerCase().includes(q) ||
            h.locationName?.toLowerCase().includes(q) ||
            h.prompt?.toLowerCase().includes(q)
        );
    }, [history, search]);

    const handleClear = () => {
        setConfirmClear(true);
    };

    const executeClear = () => {
        setHistory(clearPromptHistory());
        setConfirmClear(false);
        toast.success('Historique vide');
    };

    const handleCopy = (prompt) => {
        navigator.clipboard.writeText(prompt);
        toast.success('Prompt copie');
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMin = Math.floor((now - d) / 60000);
        if (diffMin < 1) return 'A l\'instant';
        if (diffMin < 60) return `Il y a ${diffMin}min`;
        if (diffMin < 1440) return `Il y a ${Math.floor(diffMin / 60)}h`;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
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

    return (
        <>
            <div className="h-full flex flex-col overflow-hidden">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-zinc-300">Historique</span>
                        <span className="text-[10px] text-zinc-600">{history.length} prompt{history.length !== 1 ? 's' : ''}</span>
                    </div>
                    {history.length > 0 && (
                        <button
                            onClick={handleClear}
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
                                <div className="text-2xl mb-2 opacity-20">📝</div>
                                <p className="text-zinc-500 text-[12px] font-medium">Aucun historique</p>
                                <p className="text-zinc-700 text-[11px] mt-0.5">Les prompts generes apparaitront ici</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800/30">
                            {filtered.map(entry => (
                                <div
                                    key={entry.id}
                                    className="px-3 py-2 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                >
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {entry.modelName && (
                                                <span className="text-[9px] text-violet-400/60 bg-violet-500/10 px-1.5 py-0.5 rounded shrink-0">{entry.modelName}</span>
                                            )}
                                            {entry.locationName && (
                                                <span className="text-[9px] text-fuchsia-400/60 bg-fuchsia-500/10 px-1.5 py-0.5 rounded shrink-0">{entry.locationName}</span>
                                            )}
                                        </div>
                                        <span className="text-[9px] text-zinc-700 shrink-0">{formatTime(entry.timestamp)}</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 truncate">{truncatePrompt(entry.prompt)}</p>

                                    {/* Expanded */}
                                    {expandedId === entry.id && (
                                        <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                            <pre className="text-[9px] text-zinc-600 font-mono bg-zinc-950/80 rounded-md p-2 max-h-32 overflow-auto custom-scrollbar whitespace-pre-wrap break-all">
                                                {entry.prompt}
                                            </pre>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleCopy(entry.prompt)}
                                                    className="text-[10px] text-zinc-500 hover:text-zinc-200 px-2 py-0.5 rounded-md hover:bg-zinc-800/50 transition-colors"
                                                >
                                                    Copier
                                                </button>
                                                {onReuse && (
                                                    <button
                                                        onClick={() => { onReuse(entry.prompt); toast.info('Prompt reutilise'); }}
                                                        className="text-[10px] text-violet-400 hover:text-violet-300 px-2 py-0.5 rounded-md hover:bg-violet-500/10 transition-colors"
                                                    >
                                                        ⚡ Reutiliser
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <ConfirmModal
                isOpen={confirmClear}
                title="Vider l'historique ?"
                message="Tous les prompts seront definitivement supprimes."
                confirmLabel="Vider"
                onConfirm={executeClear}
                onCancel={() => setConfirmClear(false)}
            />
        </>
    );
};

export default PromptHistoryPanel;
