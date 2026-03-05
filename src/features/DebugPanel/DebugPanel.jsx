import React, { useState, useEffect, useRef, useCallback } from 'react';
import logger from '../../utils/logger';
import { debugLogger } from '../../utils/debugLogger';

const LEVEL_STYLES = {
    info: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: 'ℹ' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '✓' },
    warn: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '⚠' },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', icon: '✕' },
    debug: { color: 'text-zinc-500', bg: 'bg-zinc-800/50', icon: '⚙' },
};

const SOURCE_LABELS = {
    api: 'API',
    storage: 'STORAGE',
    generation: 'GEN',
    app: 'APP',
};

const DEBUG_CATEGORY_COLORS = {
    system: { color: 'text-violet-400', bg: 'bg-violet-500/10' },
    prompt: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    api: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    'api-response': { color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    'api-error': { color: 'text-red-400', bg: 'bg-red-500/10' },
    scene: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
    preset: { color: 'text-purple-400', bg: 'bg-purple-500/10' },
    'location-gen': { color: 'text-orange-400', bg: 'bg-orange-500/10' },
    'image-gen': { color: 'text-pink-400', bg: 'bg-pink-500/10' },
    nav: { color: 'text-zinc-400', bg: 'bg-zinc-700/30' },
    info: { color: 'text-zinc-400', bg: 'bg-zinc-700/30' },
    warn: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
    error: { color: 'text-red-400', bg: 'bg-red-500/10' },
};

const DebugPanel = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState(() => logger.getLogs());
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [activeView, setActiveView] = useState('logs'); // 'logs' | 'debug'
    const scrollRef = useRef(null);

    // Debug mode state
    const [debugEnabled, setDebugEnabled] = useState(() => debugLogger.enabled);
    const [debugEntries, setDebugEntries] = useState(() => debugLogger.getEntries());
    const [debugFilter, setDebugFilter] = useState('all');
    const [expandedDebugId, setExpandedDebugId] = useState(null);

    useEffect(() => {
        return logger.subscribe(setLogs);
    }, []);

    // Subscribe to debug logger
    useEffect(() => {
        return debugLogger.subscribe(() => {
            setDebugEntries(debugLogger.getEntries());
            setDebugEnabled(debugLogger.enabled);
        });
    }, []);

    const handleToggleDebug = useCallback(() => {
        const newState = debugLogger.toggle();
        setDebugEnabled(newState);
    }, []);

    const handleExportDebug = useCallback(() => {
        debugLogger.downloadLog();
    }, []);

    const handleCopyDebugLog = useCallback(() => {
        navigator.clipboard.writeText(debugLogger.exportJSON());
    }, []);

    if (!isOpen) return null;

    const filtered = filter === 'all'
        ? logs
        : filter === 'error'
            ? logs.filter(l => l.level === 'error' || l.level === 'warn')
            : logs.filter(l => l.source === filter);

    const errorCount = logs.filter(l => l.level === 'error').length;

    const filteredDebug = debugFilter === 'all'
        ? debugEntries
        : debugEntries.filter(e => e.category === debugFilter);

    const debugCategories = ['all', ...new Set(debugEntries.map(e => e.category))];

    const formatTime = (ts) => {
        const d = new Date(ts);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[90] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#0c0c0e] border-l border-zinc-800/60 flex flex-col shadow-2xl animate-slide-in-right">

                {/* HEADER */}
                <div className="shrink-0 px-4 h-11 border-b border-zinc-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-zinc-200">Logs</span>
                        {errorCount > 0 && (
                            <span className="text-[10px] font-semibold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-full">{errorCount} err</span>
                        )}
                        <span className="text-[10px] text-zinc-600">{activeView === 'logs' ? `${logs.length} entrees` : `${debugEntries.length} entrées debug`}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {activeView === 'logs' && (
                            <button onClick={() => logger.clear()} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors">Vider</button>
                        )}
                        {activeView === 'debug' && debugEnabled && (
                            <>
                                <button onClick={handleCopyDebugLog} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors" title="Copier tout le log pour partager">📋</button>
                                <button onClick={handleExportDebug} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors" title="Télécharger en .json">💾</button>
                                <button onClick={() => debugLogger.clear()} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors">Vider</button>
                            </>
                        )}
                        <button onClick={onClose} className="velvet-btn-delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                </div>

                {/* VIEW TABS — Logs vs Debug */}
                <div className="shrink-0 px-4 py-1.5 border-b border-zinc-800/30 flex items-center gap-1">
                    <button
                        onClick={() => setActiveView('logs')}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${activeView === 'logs' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        📋 Logs App
                    </button>
                    <button
                        onClick={() => setActiveView('debug')}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeView === 'debug' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        🔧 Debug
                        {debugEnabled && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                    </button>
                    <div className="flex-1" />
                    {activeView === 'debug' && (
                        <button
                            onClick={handleToggleDebug}
                            className={`relative w-10 h-5 rounded-full transition-colors ${debugEnabled ? 'bg-emerald-500/30' : 'bg-zinc-800'}`}
                            title={debugEnabled ? 'Désactiver le debug' : 'Activer le debug'}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${debugEnabled ? 'left-5 bg-emerald-400' : 'left-0.5 bg-zinc-600'}`} />
                        </button>
                    )}
                </div>

                {activeView === 'logs' ? (
                    <>
                        {/* FILTERS */}
                        <div className="shrink-0 px-4 py-2 border-b border-zinc-800/30 flex items-center gap-1">
                            {[
                                { id: 'all', label: 'Tout' },
                                { id: 'error', label: 'Erreurs' },
                                { id: 'api', label: 'API' },
                                { id: 'generation', label: 'Generation' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-all ${filter === f.id
                                        ? 'bg-zinc-800 text-zinc-200'
                                        : 'text-zinc-600 hover:text-zinc-400'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* LOG ENTRIES */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
                            {filtered.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-zinc-700 text-[12px]">Aucun log</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800/30">
                                    {filtered.map(entry => {
                                        const style = LEVEL_STYLES[entry.level] || LEVEL_STYLES.debug;
                                        const isExpanded = expandedId === entry.id;
                                        return (
                                            <div
                                                key={entry.id}
                                                className={`px-4 py-2 hover:bg-white/[0.02] transition-colors cursor-pointer ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                                                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className={`text-[10px] mt-0.5 w-3 shrink-0 ${style.color}`}>{style.icon}</span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[9px] text-zinc-600 font-mono tabular-nums shrink-0">{formatTime(entry.timestamp)}</span>
                                                            <span className={`text-[9px] font-bold uppercase tracking-wider ${style.color} ${style.bg} px-1 py-px rounded`}>
                                                                {SOURCE_LABELS[entry.source] || entry.source}
                                                            </span>
                                                        </div>
                                                        <p className={`text-[11px] leading-relaxed ${entry.level === 'error' ? 'text-red-300' : entry.level === 'debug' ? 'text-zinc-600' : 'text-zinc-300'}`}>
                                                            {entry.message}
                                                        </p>
                                                        {isExpanded && entry.detail && (
                                                            <pre className="mt-1.5 text-[10px] text-zinc-600 font-mono bg-zinc-950 rounded-md px-2 py-1.5 overflow-x-auto max-h-40 custom-scrollbar whitespace-pre-wrap break-all">
                                                                {typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail, null, 2)}
                                                            </pre>
                                                        )}
                                                        {isExpanded && !entry.detail && (
                                                            <p className="mt-1 text-[10px] text-zinc-700 italic">Pas de details</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* ─── DEBUG VIEW ─── */
                    <>
                        {!debugEnabled ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center px-6">
                                    <div className="text-4xl mb-3 opacity-30">🔧</div>
                                    <p className="text-zinc-300 text-[13px] font-semibold mb-1">Mode debug désactivé</p>
                                    <p className="text-zinc-600 text-[11px] leading-relaxed mb-4">
                                        Enregistre tous les prompts envoyés, réponses API,<br />
                                        changements de scène, et erreurs pour le diagnostic.
                                    </p>
                                    <button
                                        onClick={handleToggleDebug}
                                        className="text-[12px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-lg transition-colors font-semibold"
                                    >
                                        ✨ Activer le debug
                                    </button>
                                    <p className="text-zinc-700 text-[10px] mt-3">
                                        Une fois activé, utilise l'app normalement.<br />
                                        Puis reviens ici pour copier/exporter les logs.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Category filter pills */}
                                {debugCategories.length > 2 && (
                                    <div className="shrink-0 px-4 py-2 border-b border-zinc-800/30 flex gap-1 flex-wrap">
                                        {debugCategories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setDebugFilter(cat)}
                                                className={`text-[9px] font-semibold px-2 py-0.5 rounded-md transition-colors ${debugFilter === cat
                                                    ? 'bg-zinc-700 text-zinc-200'
                                                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
                                                    }`}
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
                                            <div className="text-center">
                                                <p className="text-zinc-600 text-[12px] mb-1">En attente d'événements...</p>
                                                <p className="text-zinc-700 text-[10px]">Utilise l'app pour générer des logs</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-zinc-800/20">
                                            {[...filteredDebug].reverse().map(entry => {
                                                const catStyle = DEBUG_CATEGORY_COLORS[entry.category] || { color: 'text-zinc-500', bg: 'bg-zinc-800/50' };
                                                const isExpanded = expandedDebugId === entry.id;
                                                return (
                                                    <div
                                                        key={entry.id}
                                                        className={`px-4 py-2 hover:bg-white/[0.02] transition-colors cursor-pointer ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                                                        onClick={() => setExpandedDebugId(isExpanded ? null : entry.id)}
                                                    >
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[9px] text-zinc-600 font-mono tabular-nums shrink-0">{formatTime(entry.ts)}</span>
                                                            <span className={`text-[9px] font-bold uppercase tracking-wider ${catStyle.color} ${catStyle.bg} px-1.5 py-0.5 rounded`}>
                                                                {entry.category}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-zinc-300 leading-relaxed">{entry.message}</p>
                                                        {isExpanded && entry.data && (
                                                            <div className="mt-1.5" onClick={e => e.stopPropagation()}>
                                                                <pre className="text-[10px] text-zinc-500 font-mono bg-zinc-950 rounded-md px-2.5 py-2 overflow-x-auto max-h-60 custom-scrollbar whitespace-pre-wrap break-all">
                                                                    {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}
                                                                </pre>
                                                                <button
                                                                    onClick={() => navigator.clipboard.writeText(typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2))}
                                                                    className="text-[9px] text-zinc-600 hover:text-zinc-300 mt-1 px-2 py-0.5 rounded hover:bg-zinc-800/50 transition-colors"
                                                                >
                                                                    📋 Copier ces données
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom bar with quick actions */}
                                <div className="shrink-0 px-4 py-2 border-t border-zinc-800/30 flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-600">{debugEntries.length} entrées</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleCopyDebugLog} className="text-[10px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors font-medium">
                                            📋 Copier tout
                                        </button>
                                        <button onClick={handleExportDebug} className="text-[10px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors font-medium">
                                            💾 Exporter .json
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DebugPanel;
