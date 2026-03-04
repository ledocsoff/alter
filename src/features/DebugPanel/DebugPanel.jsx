import React, { useState, useEffect, useRef } from 'react';
import logger from '../../utils/logger';

const LEVEL_STYLES = {
    info: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: 'ℹ' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '✓' },
    warn: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: '⚠' },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', icon: '✕' },
    debug: { color: 'text-zinc-500', bg: 'bg-zinc-800/50', icon: '⚙' },
};

const SOURCE_LABELS = {
    api: 'API',
    storage: 'STORAGE',
    generation: 'GEN',
    app: 'APP',
};

const DebugPanel = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState(() => logger.getLogs());
    const [filter, setFilter] = useState('all'); // 'all' | 'error' | 'api' | 'generation'
    const [expandedId, setExpandedId] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        return logger.subscribe(setLogs);
    }, []);

    if (!isOpen) return null;

    const filtered = filter === 'all'
        ? logs
        : filter === 'error'
            ? logs.filter(l => l.level === 'error' || l.level === 'warn')
            : logs.filter(l => l.source === filter);

    const errorCount = logs.filter(l => l.level === 'error').length;

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
                        <span className="text-[10px] text-zinc-600">{logs.length} entrees</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => logger.clear()}
                            className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors"
                        >
                            Vider
                        </button>
                        <button
                            onClick={onClose}
                            className="text-zinc-600 hover:text-zinc-300 text-lg transition-colors w-6 h-6 flex items-center justify-center"
                        >
                            &times;
                        </button>
                    </div>
                </div>

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
            </div>
        </div>
    );
};

export default DebugPanel;
