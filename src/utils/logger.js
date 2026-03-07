// ============================================
// LOGGER UNIFIÉ — Alter
// Deux niveaux : Activité (toujours on) + Technique (opt-in verbose)
// ============================================

const MAX_LOGS = 300;
const VERBOSE_STORAGE_KEY = 'alter_verbose_mode';

let _logs = [];
let _listeners = new Set();
let _verbose = false;

// Restore verbose state from localStorage
try { _verbose = localStorage.getItem(VERBOSE_STORAGE_KEY) === 'true'; } catch { }
// ─── OMNISCIENT DEBUG (INTERCEPTS) ───

const truncateLongStrings = (item) => {
    if (typeof item === 'string') {
        if (item.length > 2000) return item.substring(0, 100) + `... [TRONQUÉ: ${item.length} caractères]`;
        return item;
    }
    if (Array.isArray(item)) return item.map(truncateLongStrings);
    if (item !== null && typeof item === 'object') {
        const copy = {};
        for (const [k, v] of Object.entries(item)) {
            copy[k] = truncateLongStrings(v);
        }
        return copy;
    }
    return item;
};

let _hijacked = false;
const hijackSystem = () => {
    if (_hijacked || typeof window === 'undefined') return;
    _hijacked = true;

    // 1. Intercept Console
    const methods = ['log', 'info', 'warn', 'error'];
    methods.forEach(method => {
        const original = console[method];
        console[method] = (...args) => {
            original.apply(console, args);
            // Only capture if verbose mode is on, to save memory during normal use
            if (_verbose) {
                // Avoid infinite loops if we are reacting to our own network intercepts
                if (args[0] === '[Server]' || args[0] === '[Server Error]' || args[0] === '[Electron]') return;
                try {
                    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(truncateLongStrings(a)) : String(a)).join(' ');
                    _add(method === 'log' ? 'debug' : method, 'app', `[CONSOLE] ${msg}`, null, 'console');
                } catch { } // Ignore circular JSON errors from random console logs
            }
        };
    });

    // 2. Intercept Fetch API
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        if (!_verbose) return originalFetch.apply(window, args);

        const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || 'unknown');
        // Filter out Vite Hot Module Reload spam
        if (url.includes('@vite') || url.includes('.vite')) return originalFetch.apply(window, args);

        const method = args[1]?.method || 'GET';
        let payload = null;

        if (args[1]?.body && typeof args[1].body === 'string') {
            try { payload = JSON.parse(args[1].body); } catch { payload = args[1].body; }
        }

        _add('debug', 'api', `[FETCH OUT] ${method} ${url.substring(0, 100)}`, truncateLongStrings(payload), 'network');

        try {
            const response = await originalFetch.apply(window, args);
            const clone = response.clone();

            const isJson = clone.headers.get('content-type')?.includes('application/json');
            if (isJson) {
                clone.json().then(data => {
                    _add(response.ok ? 'debug' : 'error', 'api', `[FETCH IN] ${response.status} ${url.substring(0, 100)}`, truncateLongStrings(data), 'network');
                }).catch(() => {
                    _add(response.ok ? 'debug' : 'error', 'api', `[FETCH IN] ${response.status} ${url.substring(0, 100)}`, '[Response body unreadable]', 'network');
                });
            } else {
                _add(response.ok ? 'debug' : 'error', 'api', `[FETCH IN] ${response.status} ${url.substring(0, 100)}`, `[Type: ${clone.headers.get('content-type')}]`, 'network');
            }
            return response;
        } catch (err) {
            _add('error', 'api', `[FETCH FAIL] ${method} ${url.substring(0, 100)}`, err.message, 'network');
            throw err;
        }
    };

    // 3. Global Errors
    window.addEventListener('error', (e) => {
        if (_verbose) _add('error', 'app', `[CRASH] ${e.message}`, e.error?.stack || null, 'exception');
    });
    window.addEventListener('unhandledrejection', (e) => {
        if (_verbose) _add('error', 'app', `[PROMISE REJECT] ${String(e.reason)}`, null, 'exception');
    });
};

// ─── CORE ───

let _notifyTimeout = null;
const _notify = () => {
    if (_notifyTimeout) return;
    _notifyTimeout = setTimeout(() => {
        _notifyTimeout = null;
        _listeners.forEach(fn => { try { fn(); } catch { } });
    }, 0);
};

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

    exportJSON: () => JSON.stringify({
        exportedAt: new Date().toISOString(),
        verboseMode: _verbose,
        entryCount: _logs.length,
        entries: _logs,
    }, null, 2),

    exportMarkdown: () => {
        let md = `# Alter - Debug Logs\n`;
        md += `Date: ${new Date().toISOString()}\n`;
        md += `Verbose Mode: ${_verbose}\n`;
        md += `Total Entries: ${_logs.length}\n\n`;

        // Reverse so chronological order (oldest first)
        [..._logs].reverse().forEach(l => {
            md += `### [${l.level.toUpperCase()}] [${(l.category || l.source).toUpperCase()}] ${l.message}\n`;
            md += `- **Time:** ${new Date(l.timestamp).toISOString()}\n`;
            if (l.detail) {
                const detailStr = typeof l.detail === 'string' ? l.detail : JSON.stringify(l.detail, null, 2);
                md += `- **Detail:**\n\`\`\`json\n${detailStr}\n\`\`\`\n`;
            }
            md += `\n---\n\n`;
        });
        return md;
    },

    downloadLog: () => {
        const json = logger.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alter-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
};

// Expose globally for console access
if (typeof window !== 'undefined') {
    window.__ALTER_DEBUG = logger;
}

hijackSystem();

export default logger;
