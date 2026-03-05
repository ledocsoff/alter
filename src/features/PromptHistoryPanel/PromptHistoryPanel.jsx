import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '../../store/ToastContext';
import { getPromptHistory, clearPromptHistory } from '../../utils/storage';
import { debugLogger } from '../../utils/debugLogger';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { FileTextIcon, ZapIcon } from '../../components/Icons';

const CATEGORY_COLORS = {
    system: 'text-violet-400',
    prompt: 'text-emerald-400',
    api: 'text-blue-400',
    'api-response': 'text-cyan-400',
    'api-error': 'text-red-400',
    scene: 'text-amber-400',
    preset: 'text-purple-400',
    'location-gen': 'text-orange-400',
    'image-gen': 'text-pink-400',
    nav: 'text-zinc-400',
    info: 'text-zinc-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
};

const PromptHistoryPanel = ({ onReuse }) => {
    const toast = useToast();
    const [history, setHistory] = useState(() => getPromptHistory());
    const [expandedId, setExpandedId] = useState(null);
    const [search, setSearch] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);
    const [activeTab, setActiveTab] = useState('history'); // 'history' | 'debug'

    // Debug panel state
    const [debugEnabled, setDebugEnabled] = useState(() => debugLogger.enabled);
    const [debugEntries, setDebugEntries] = useState(() => debugLogger.getEntries());
    const [debugFilter, setDebugFilter] = useState('all');
    const [expandedDebugId, setExpandedDebugId] = useState(null);

    // Subscribe to debug logger updates
    useEffect(() => {
        return debugLogger.subscribe(() => {
            setDebugEntries(debugLogger.getEntries());
            setDebugEnabled(debugLogger.enabled);
        });
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return history;
        const q = search.toLowerCase();
        return history.filter(h =>
            h.modelName?.toLowerCase().includes(q) ||
            h.locationName?.toLowerCase().includes(q) ||
            h.prompt?.toLowerCase().includes(q)
        );
    }, [history, search]);

    const filteredDebug = useMemo(() => {
        if (debugFilter === 'all') return debugEntries;
        return debugEntries.filter(e => e.category === debugFilter);
    }, [debugEntries, debugFilter]);

    const debugCategories = useMemo(() => {
        const cats = new Set(debugEntries.map(e => e.category));
        return ['all', ...Array.from(cats)];
    }, [debugEntries]);

    const handleClear = () => {
        setConfirmClear(true);
    };

    const executeClear = () => {
        setHistory(clearPromptHistory());
        setConfirmClear(false);
        toast.success('Historique vidé');
    };

    const handleCopy = (prompt) => {
        navigator.clipboard.writeText(prompt);
        toast.success('Prompt copié');
    };

    const handleToggleDebug = useCallback(() => {
        const newState = debugLogger.toggle();
        setDebugEnabled(newState);
        toast.info(newState ? '🔧 Mode debug activé' : '🔧 Mode debug désactivé');
    }, [toast]);

    const handleExportDebug = useCallback(() => {
        debugLogger.downloadLog();
        toast.success('Log exporté');
    }, [toast]);

    const handleCopyDebugLog = useCallback(() => {
        navigator.clipboard.writeText(debugLogger.exportJSON());
        toast.success('Log copié dans le presse-papiers');
    }, [toast]);

    const formatTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMin = Math.floor((now - d) / 60000);
        if (diffMin < 1) return 'A l\'instant';
        if (diffMin < 60) return `Il y a ${diffMin}min`;
        if (diffMin < 1440) return `Il y a ${Math.floor(diffMin / 60)}h`;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    };

    const formatDebugTime = (ts) => {
        try { return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return ts; }
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
                {/* Tabs */}
                <div className="shrink-0 flex items-center border-b border-zinc-800/40">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 text-[11px] font-semibold py-2 text-center transition-colors border-b-2 ${activeTab === 'history' ? 'text-zinc-200 border-violet-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                    >
                        Historique
                    </button>
                    <button
                        onClick={() => setActiveTab('debug')}
                        className={`flex-1 text-[11px] font-semibold py-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'debug' ? 'text-zinc-200 border-emerald-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                    >
                        🔧 Debug
                        {debugEnabled && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                    </button>
                </div>

                {activeTab === 'history' ? (
                    <>
                        {/* History Header */}
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
                                        <div className="mb-2 opacity-20"><FileTextIcon size={28} /></div>
                                        <p className="text-zinc-500 text-[12px] font-medium">Aucun historique</p>
                                        <p className="text-zinc-700 text-[11px] mt-0.5">Les prompts générés apparaîtront ici</p>
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
                                                    {entry.turnCount > 0 && (
                                                        <span className="text-[9px] text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Tour {entry.turnCount + 1}</span>
                                                    )}
                                                    {entry.refCount > 0 && (
                                                        <span className="text-[9px] text-amber-400/60 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">{entry.refCount} ref{entry.refCount > 1 ? 's' : ''}</span>
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
                                                                onClick={() => { onReuse(entry.prompt); toast.info('Prompt réutilisé'); }}
                                                                className="text-[10px] text-violet-400 hover:text-violet-300 px-2 py-0.5 rounded-md hover:bg-violet-500/10 transition-colors"
                                                            >
                                                                <ZapIcon size={10} className="inline -mt-px" /> Réutiliser
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
                    </>
                ) : (
                    /* ─── DEBUG TAB ─── */
                    <>
                        {/* Debug Header */}
                        <div className="shrink-0 px-3 py-2 border-b border-zinc-800/40">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[12px] font-semibold text-zinc-300">Mode Debug</span>
                                {/* Toggle */}
                                <button
                                    onClick={handleToggleDebug}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${debugEnabled ? 'bg-emerald-500/30' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${debugEnabled ? 'left-5 bg-emerald-400' : 'left-0.5 bg-zinc-600'}`} />
                                </button>
                            </div>
                            {debugEnabled && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-600">{debugEntries.length} entrées</span>
                                    <div className="flex-1" />
                                    <button onClick={handleCopyDebugLog} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition-colors">📋 Copier</button>
                                    <button onClick={handleExportDebug} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition-colors">💾 Exporter</button>
                                    <button onClick={() => { debugLogger.clear(); toast.info('Logs vidés'); }} className="text-[10px] text-zinc-600 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors">Vider</button>
                                </div>
                            )}
                        </div>

                        {/* Debug Content */}
                        {!debugEnabled ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center px-6">
                                    <div className="text-3xl mb-3 opacity-30">🔧</div>
                                    <p className="text-zinc-400 text-[12px] font-medium mb-1">Mode debug désactivé</p>
                                    <p className="text-zinc-600 text-[11px] leading-relaxed">
                                        Active le debug pour enregistrer tous les prompts envoyés, réponses API, changements de scène et erreurs.
                                    </p>
                                    <button
                                        onClick={handleToggleDebug}
                                        className="mt-3 text-[11px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                    >
                                        Activer le debug
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Category filter */}
                                {debugCategories.length > 2 && (
                                    <div className="shrink-0 px-3 py-1.5 border-b border-zinc-800/20 flex gap-1 flex-wrap">
                                        {debugCategories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setDebugFilter(cat)}
                                                className={`text-[9px] px-1.5 py-0.5 rounded-md transition-colors ${debugFilter === cat ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Debug entries */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {filteredDebug.length === 0 ? (
                                        <div className="flex items-center justify-center h-full">
                                            <p className="text-zinc-600 text-[11px]">En attente d'événements...</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-zinc-800/20">
                                            {[...filteredDebug].reverse().map(entry => (
                                                <div
                                                    key={entry.id}
                                                    className="px-3 py-1.5 hover:bg-zinc-800/20 transition-colors cursor-pointer"
                                                    onClick={() => setExpandedDebugId(expandedDebugId === entry.id ? null : entry.id)}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[9px] font-mono shrink-0 ${CATEGORY_COLORS[entry.category] || 'text-zinc-500'}`}>
                                                            {entry.category}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400 truncate flex-1">{entry.message}</span>
                                                        <span className="text-[9px] text-zinc-700 font-mono shrink-0">{formatDebugTime(entry.ts)}</span>
                                                    </div>
                                                    {expandedDebugId === entry.id && entry.data && (
                                                        <pre className="mt-1 text-[9px] text-zinc-600 font-mono bg-zinc-950/80 rounded-md p-2 max-h-48 overflow-auto custom-scrollbar whitespace-pre-wrap break-all">
                                                            {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
            <ConfirmModal
                isOpen={confirmClear}
                title="Vider l'historique ?"
                message="Tous les prompts seront définitivement supprimés."
                confirmLabel="Vider"
                onConfirm={executeClear}
                onCancel={() => setConfirmClear(false)}
            />
        </>
    );
};

export default PromptHistoryPanel;
