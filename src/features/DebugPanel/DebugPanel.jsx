import React, { useState, useEffect, useRef, useCallback } from 'react';
import logger from '../../utils/logger';

// ─── Style maps ───

const LEVEL_STYLES = {
    info: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: 'ℹ' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '✓' },
    warn: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '⚠' },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', icon: '✕' },
    debug: { color: 'text-zinc-500', bg: 'bg-zinc-800/50', icon: '⚙' },
};

const SOURCE_LABELS = {
    api: 'API', storage: 'STORAGE', generation: 'GEN', app: 'APP', nav: 'NAV',
    prompt: 'PROMPT', scene: 'SCENE', preset: 'PRESET',
    'api-response': 'API', 'api-error': 'API', 'location-gen': 'GEN', 'image-gen': 'GEN',
};

const SOURCE_COLORS = {
    api: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    storage: { color: 'text-zinc-400', bg: 'bg-zinc-700/30' },
    generation: { color: 'text-pink-400', bg: 'bg-pink-500/10' },
    app: { color: 'text-violet-400', bg: 'bg-violet-500/10' },
    nav: { color: 'text-zinc-400', bg: 'bg-zinc-700/30' },
    prompt: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    scene: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
    preset: { color: 'text-purple-400', bg: 'bg-purple-500/10' },
    'api-response': { color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    'api-error': { color: 'text-red-400', bg: 'bg-red-500/10' },
    'location-gen': { color: 'text-orange-400', bg: 'bg-orange-500/10' },
    'image-gen': { color: 'text-pink-400', bg: 'bg-pink-500/10' },
};

// ─── Helpers ───

const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

// ─── Log Entry Component ───

const LogEntry = ({ entry, isExpanded, onToggle }) => {
    const style = LEVEL_STYLES[entry.level] || LEVEL_STYLES.debug;
    const sourceKey = entry.category || entry.source;
    const srcColor = SOURCE_COLORS[sourceKey] || SOURCE_COLORS.app;
    const srcLabel = SOURCE_LABELS[sourceKey] || sourceKey?.toUpperCase() || '???';

    return (
        <div
            className={`px-4 py-2 hover:bg-white/[0.02] transition-colors cursor-pointer ${isExpanded ? 'bg-white/[0.02]' : ''}`}
            onClick={onToggle}
        >
            <div className="flex items-start gap-2">
                <span className={`text-[10px] mt-0.5 w-3 shrink-0 ${style.color}`}>{style.icon}</span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] text-zinc-600 font-mono tabular-nums shrink-0">{formatTime(entry.timestamp)}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${srcColor.color} ${srcColor.bg} px-1 py-px rounded`}>
                            {srcLabel}
                        </span>
                        {entry.level === 'debug' && (
                            <span className="text-[8px] text-zinc-700 font-mono">verbose</span>
                        )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${entry.level === 'error' ? 'text-red-300' : entry.level === 'debug' ? 'text-zinc-500' : 'text-zinc-300'}`}>
                        {entry.message}
                    </p>
                    {isExpanded && entry.detail && (
                        <div className="mt-1.5" onClick={e => e.stopPropagation()}>
                            <pre className="text-[10px] text-zinc-500 font-mono bg-zinc-950 rounded-md px-2.5 py-2 overflow-x-auto max-h-60 custom-scrollbar whitespace-pre-wrap break-all">
                                {typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail, null, 2)}
                            </pre>
                            <button
                                onClick={() => navigator.clipboard.writeText(typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail, null, 2))}
                                className="text-[9px] text-zinc-600 hover:text-zinc-300 mt-1 px-2 py-0.5 rounded hover:bg-zinc-800/50 transition-colors"
                            >
                                📋 Copier
                            </button>
                        </div>
                    )}
                    {isExpanded && !entry.detail && (
                        <p className="mt-1 text-[10px] text-zinc-700 italic">Pas de détails</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Filter Pills ───

const ACTIVITY_FILTERS = [
    { id: 'all', label: 'Tout' },
    { id: 'error', label: 'Erreurs' },
    { id: 'api', label: 'API' },
    { id: 'generation', label: 'Génération' },
];

const FilterPills = ({ filters, active, onSelect }) => (
    <div className="shrink-0 px-4 py-2 border-b border-zinc-800/30 flex items-center gap-1 flex-wrap">
        {filters.map(f => (
            <button
                key={f.id}
                onClick={() => onSelect(f.id)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-all ${active === f.id
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400'
                    }`}
            >
                {f.label}
            </button>
        ))}
    </div>
);

// ─── Main Panel ───

const DebugPanel = ({ isOpen, onClose }) => {
    const [allLogs, setAllLogs] = useState(() => logger.getLogs());
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [activeView, setActiveView] = useState('activity'); // 'activity' | 'technical'
    const [verboseEnabled, setVerboseEnabled] = useState(() => logger.isVerbose);
    const [techFilter, setTechFilter] = useState('all');

    useEffect(() => {
        return logger.subscribe(() => {
            setAllLogs(logger.getLogs());
            setVerboseEnabled(logger.isVerbose);
        });
    }, []);

    const handleToggleVerbose = useCallback(() => {
        logger.toggleVerbose();
    }, []);

    if (!isOpen) return null;

    // ─── Compute displayed logs ───
    const activityLogs = allLogs.filter(l => l.level !== 'debug');
    const filteredActivity = filter === 'all' ? activityLogs
        : filter === 'error' ? activityLogs.filter(l => l.level === 'error' || l.level === 'warn')
            : activityLogs.filter(l => l.source === filter);

    // Technical: all logs including debug, with dynamic category filters
    const techCategories = ['all', ...new Set(allLogs.map(l => l.category || l.source).filter(Boolean))];
    const techFilters = techCategories.map(c => ({ id: c, label: c === 'all' ? 'Tout' : (SOURCE_LABELS[c] || c) }));
    const filteredTech = techFilter === 'all' ? allLogs
        : allLogs.filter(l => (l.category || l.source) === techFilter);

    const displayed = activeView === 'activity' ? filteredActivity : filteredTech;
    const errorCount = allLogs.filter(l => l.level === 'error').length;

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
                        <span className="text-[10px] text-zinc-600">{displayed.length} entrées</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {activeView === 'technical' && verboseEnabled && (
                            <>
                                <button onClick={() => navigator.clipboard.writeText(logger.exportJSON())} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors" title="Copier tout">📋</button>
                                <button onClick={() => logger.downloadLog()} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors" title="Exporter .json">💾</button>
                            </>
                        )}
                        <button onClick={() => logger.clear()} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors">Vider</button>
                        <button onClick={onClose} className="velvet-btn-delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                </div>

                {/* VIEW TABS */}
                <div className="shrink-0 px-4 py-1.5 border-b border-zinc-800/30 flex items-center gap-1">
                    <button
                        onClick={() => setActiveView('activity')}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${activeView === 'activity' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        📋 Activité
                    </button>
                    <button
                        onClick={() => setActiveView('technical')}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeView === 'technical' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        🔧 Technique
                        {verboseEnabled && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                    </button>
                    <div className="flex-1" />
                    {activeView === 'technical' && (
                        <button
                            onClick={handleToggleVerbose}
                            className={`relative w-10 h-5 rounded-full transition-colors ${verboseEnabled ? 'bg-emerald-500/30' : 'bg-zinc-800'}`}
                            title={verboseEnabled ? 'Désactiver les logs techniques' : 'Activer les logs techniques'}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${verboseEnabled ? 'left-5 bg-emerald-400' : 'left-0.5 bg-zinc-600'}`} />
                        </button>
                    )}
                </div>

                {/* FILTERS */}
                {activeView === 'activity' ? (
                    <FilterPills filters={ACTIVITY_FILTERS} active={filter} onSelect={setFilter} />
                ) : verboseEnabled && techCategories.length > 2 ? (
                    <FilterPills filters={techFilters} active={techFilter} onSelect={setTechFilter} />
                ) : null}

                {/* CONTENT */}
                {activeView === 'technical' && !verboseEnabled ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center px-6">
                            <div className="text-4xl mb-3 opacity-30">🔧</div>
                            <p className="text-zinc-300 text-[13px] font-semibold mb-1">Mode technique désactivé</p>
                            <p className="text-zinc-600 text-[11px] leading-relaxed mb-4">
                                Enregistre les prompts envoyés, réponses API,<br />
                                changements de scène, et données techniques.
                            </p>
                            <button
                                onClick={handleToggleVerbose}
                                className="text-[12px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-lg transition-colors font-semibold"
                            >
                                ✨ Activer
                            </button>
                            <p className="text-zinc-700 text-[10px] mt-3">
                                Les logs d'activité restent visibles dans l'autre onglet.<br />
                                Ce mode ajoute les données techniques détaillées.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {displayed.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-zinc-700 text-[12px]">
                                    {activeView === 'activity' ? 'Aucune activité' : 'En attente d\'événements...'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800/30">
                                {displayed.map(entry => (
                                    <LogEntry
                                        key={entry.id}
                                        entry={entry}
                                        isExpanded={expandedId === entry.id}
                                        onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* BOTTOM BAR — Technical only */}
                {activeView === 'technical' && verboseEnabled && (
                    <div className="shrink-0 px-4 py-2 border-t border-zinc-800/30 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-600">{allLogs.length} entrées totales</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigator.clipboard.writeText(logger.exportJSON())} className="text-[10px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors font-medium">
                                📋 Copier tout
                            </button>
                            <button onClick={() => logger.downloadLog()} className="text-[10px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors font-medium">
                                💾 Exporter .json
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DebugPanel;
