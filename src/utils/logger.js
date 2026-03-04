// Logger global pour le debug — capture les événements clés de l'app
// Chaque log = { id, timestamp, level, source, message, detail? }

const MAX_LOGS = 200;
let _logs = [];
let _listeners = new Set();

const _notify = () => _listeners.forEach(fn => fn([..._logs]));

const _add = (level, source, message, detail) => {
    const entry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        level, // 'info' | 'warn' | 'error' | 'success' | 'debug'
        source, // 'api' | 'storage' | 'generation' | 'app'
        message,
        detail: detail || null,
    };
    _logs.unshift(entry);
    if (_logs.length > MAX_LOGS) _logs.length = MAX_LOGS;
    _notify();
    return entry;
};

const logger = {
    info: (source, message, detail) => _add('info', source, message, detail),
    success: (source, message, detail) => _add('success', source, message, detail),
    warn: (source, message, detail) => _add('warn', source, message, detail),
    error: (source, message, detail) => _add('error', source, message, detail),
    debug: (source, message, detail) => _add('debug', source, message, detail),

    // Subscribe pour le composant React
    subscribe: (fn) => { _listeners.add(fn); return () => _listeners.delete(fn); },
    getLogs: () => [..._logs],
    clear: () => { _logs = []; _notify(); },
};

export default logger;
