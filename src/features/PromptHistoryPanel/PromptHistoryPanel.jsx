import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '../../store/ToastContext';
import { getPromptHistory, clearPromptHistory } from '../../utils/storage';
import { debugLogger } from '../../utils/debugLogger';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { FileTextIcon } from '../../components/Icons';

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

const PromptHistoryPanel = ({ onReuse, generatedPrompt }) => {
    const toast = useToast();
    const [history, setHistory] = useState(() => getPromptHistory());
    const [search, setSearch] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);
    const [confirmReuse, setConfirmReuse] = useState(null); // { id, prompt }
    const [activeTab, setActiveTab] = useState('prompt'); // 'prompt' | 'history' | 'debug'

    // Debug panel state
    const [debugEnabled, setDebugEnabled] = useState(() => debugLogger.enabled);
    const [debugEntries, setDebugEntries] = useState(() => debugLogger.getEntries());
    const [debugFilter, setDebugFilter] = useState('all');
    const [expandedDebugId, setExpandedDebugId] = useState(null);

    // Refresh history when switching to history tab
    useEffect(() => {
        if (activeTab === 'history') setHistory(getPromptHistory());
    }, [activeTab]);

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

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copié');
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
        if (diffMin < 60) return `${diffMin}min`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
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

    const galleryImageUrl = (id) => id ? `http://localhost:3001/api/gallery/${encodeURIComponent(id)}/image` : null;

    return (
        <>
            <div className="h-full flex flex-col overflow-hidden">
                {/* Sub-tabs */}
                <div className="shrink-0 flex items-center border-b border-zinc-800/40">
                    <button
                        onClick={() => setActiveTab('prompt')}
                        className={`flex-1 text-[11px] font-semibold py-2 text-center transition-colors border-b-2 ${activeTab === 'prompt' ? 'text-zinc-200 border-violet-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                    >
                        Prompt actuel
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 text-[11px] font-semibold py-2 text-center transition-colors border-b-2 ${activeTab === 'history' ? 'text-zinc-200 border-violet-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                    >
                        Historique
                        {history.length > 0 && <span className="ml-1 text-[9px] text-zinc-600">({history.length})</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('debug')}
                        className={`flex-1 text-[11px] font-semibold py-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'debug' ? 'text-zinc-200 border-emerald-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                    >
                        🔧
                        {debugEnabled && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
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
                            <span className="text-[11px] text-zinc-500">{history.length} prompt{history.length !== 1 ? 's' : ''}</span>
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
                                        return (
                                            <div
                                                key={entry.id}
                                                className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                                                onClick={() => setConfirmReuse({ id: entry.id, prompt: entry.prompt })}
                                            >
                                                {/* Image thumbnail */}
                                                <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/[0.05]">
                                                    {imgUrl ? (
                                                        <img
                                                            src={imgUrl}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
                                                            <FileTextIcon size={14} className="text-violet-400/30" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        {entry.locationName && (
                                                            <span className="text-[9px] text-fuchsia-400/60 bg-fuchsia-500/10 px-1.5 py-0.5 rounded shrink-0">{entry.locationName}</span>
                                                        )}
                                                        <span className="text-[9px] text-zinc-700 ml-auto shrink-0">{formatTime(entry.timestamp)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 truncate group-hover:text-zinc-300 transition-colors">{truncatePrompt(entry.prompt)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ─── DEBUG TAB ─── */}
                {activeTab === 'debug' && (
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
                                        Active le debug pour enregistrer tous les prompts envoyés, réponses API et erreurs.
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
