// ============================================
// LOGGER UNIFIÉ — Velvet Studio
// Deux niveaux : Activité (toujours on) + Technique (opt-in verbose)
// ============================================

const MAX_LOGS = 300;
const VERBOSE_STORAGE_KEY = 'velvet_verbose_mode';

let _logs = [];
let _listeners = new Set();
let _verbose = false;

// Restore verbose state from localStorage
try { _verbose = localStorage.getItem(VERBOSE_STORAGE_KEY) === 'true'; } catch { }

// ─── CORE ───

const _notify = () => _listeners.forEach(fn => { try { fn(); } catch { } });

const _add = (level, source, message, detail = null, category = null) => {
    const entry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        level,       // 'info' | 'success' | 'warn' | 'error' | 'debug'
        source,      // 'api' | 'storage' | 'generation' | 'app' | 'nav'
        message,
        detail,
        category,    // optional sub-category for filtering: 'prompt' | 'api-response' | 'scene' | 'preset' | etc.
    };
    _logs.unshift(entry);
    if (_logs.length > MAX_LOGS) _logs.length = MAX_LOGS;
    _notify();
    return entry;
};

// ─── PUBLIC API ───

const logger = {
    // === Always-on activity logs ===
    info: (source, message, detail) => _add('info', source, message, detail),
    success: (source, message, detail) => _add('success', source, message, detail),
    warn: (source, message, detail) => _add('warn', source, message, detail),
    error: (source, message, detail) => _add('error', source, message, detail),

    // === Verbose-only (technical / debug) ===
    // These are only recorded when verbose mode is ON
    debug: (source, message, detail, category = null) => {
        if (!_verbose) return;
        _add('debug', source, message, detail, category);
    },

    // Verbose with explicit category (for prompt/API/scene tracking)
    verbose: (category, message, data = null) => {
        if (!_verbose) return;
        _add('debug', category, message, data, category);
    },

    // === Verbose mode control ===
    get isVerbose() { return _verbose; },
    setVerbose: (val) => {
        _verbose = !!val;
        try { localStorage.setItem(VERBOSE_STORAGE_KEY, _verbose ? 'true' : 'false'); } catch { }
        if (_verbose) {
            _add('info', 'app', '🔧 Mode technique activé', { timestamp: new Date().toISOString() });
        }
        _notify();
    },
    toggleVerbose: () => {
        logger.setVerbose(!_verbose);
        return _verbose;
    },

    // === Data access ===
    getLogs: () => [..._logs],
    getActivityLogs: () => _logs.filter(l => l.level !== 'debug'),
    getVerboseLogs: () => [..._logs],

    // === Subscriptions ===
    subscribe: (fn) => { _listeners.add(fn); return () => _listeners.delete(fn); },

    // === Management ===
    clear: () => { _logs = []; _notify(); },

    // === Export (for sharing / diagnosis) ===
    exportJSON: () => JSON.stringify({
        exportedAt: new Date().toISOString(),
        verboseMode: _verbose,
        entryCount: _logs.length,
        entries: _logs,
    }, null, 2),

    downloadLog: () => {
        const json = logger.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `velvet-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
};

// Expose globally for console access
if (typeof window !== 'undefined') {
    window.__VELVET_DEBUG = logger;
}

export default logger;
