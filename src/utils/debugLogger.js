/**
 * Debug Logger — Mode debug pour Velvet Studio
 * 
 * Enregistre tous les événements (prompts, API calls, erreurs, state changes)
 * dans un buffer en mémoire, accessible depuis l'UI.
 * 
 * Activation: toggle dans le panneau Logs ou window.__VELVET_DEBUG = true
 */

import React from 'react';

const MAX_ENTRIES = 500;
const STORAGE_KEY = 'velvet_debug_mode';

class DebugLogger {
    constructor() {
        this._entries = [];
        this._listeners = new Set();
        this._enabled = false;

        // Restore persisted state
        try {
            this._enabled = localStorage.getItem(STORAGE_KEY) === 'true';
        } catch { }

        // Expose globally for console access
        if (typeof window !== 'undefined') {
            window.__VELVET_DEBUG = this;
        }
    }

    get enabled() { return this._enabled; }

    setEnabled(val) {
        this._enabled = !!val;
        try { localStorage.setItem(STORAGE_KEY, this._enabled ? 'true' : 'false'); } catch { }
        if (this._enabled) {
            this._log('system', '🔧 Debug mode ACTIVÉ', { timestamp: new Date().toISOString() });
        }
        this._notify();
    }

    toggle() {
        this.setEnabled(!this._enabled);
        return this._enabled;
    }

    // === CORE LOGGING ===

    _log(category, message, data = null) {
        if (!this._enabled) return;
        const entry = {
            id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ts: new Date().toISOString(),
            category,
            message,
            data,
        };
        this._entries.push(entry);
        if (this._entries.length > MAX_ENTRIES) {
            this._entries = this._entries.slice(-MAX_ENTRIES);
        }
        // Also mirror to console in dev
        const style = CATEGORY_STYLES[category] || 'color: gray';
        console.log(`%c[Velvet Debug][${category}]`, style, message, data || '');
        this._notify();
    }

    // === CATEGORY LOGGERS ===

    /** Prompt sent to AI (the full JSON matrix) */
    prompt(action, promptData) {
        this._log('prompt', `📝 ${action}`, promptData);
    }

    /** API call to Google AI */
    apiCall(endpoint, params) {
        this._log('api', `🌐 ${endpoint}`, params);
    }

    /** API response received */
    apiResponse(endpoint, response) {
        this._log('api-response', `✅ ${endpoint}`, {
            status: response?.status,
            size: typeof response === 'string' ? response.length : JSON.stringify(response || '').length,
            preview: typeof response === 'string' ? response.slice(0, 200) : response,
        });
    }

    /** API error */
    apiError(endpoint, error) {
        this._log('api-error', `❌ ${endpoint}`, {
            message: error?.message || String(error),
            stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
        });
    }

    /** Scene state change */
    sceneChange(field, oldVal, newVal) {
        this._log('scene', `🎬 ${field}`, { from: oldVal, to: newVal });
    }

    /** Preset applied */
    presetApplied(presetName, presetData) {
        this._log('preset', `🎨 Preset: ${presetName}`, presetData);
    }

    /** Location AI generation */
    locationGen(step, locationName, data = null) {
        this._log('location-gen', `📍 ${step}: ${locationName}`, data);
    }

    /** Image generation */
    imageGen(action, data = null) {
        this._log('image-gen', `🖼️ ${action}`, data);
    }

    /** Navigation / route change */
    navigation(from, to) {
        this._log('nav', `🧭 ${from} → ${to}`, null);
    }

    /** Generic info */
    info(message, data = null) {
        this._log('info', `ℹ️ ${message}`, data);
    }

    /** Warning */
    warn(message, data = null) {
        this._log('warn', `⚠️ ${message}`, data);
    }

    /** Error */
    error(message, data = null) {
        this._log('error', `🚨 ${message}`, data);
    }

    // === DATA ACCESS ===

    getEntries(filter = null) {
        if (!filter) return [...this._entries];
        return this._entries.filter(e => e.category === filter);
    }

    getLastN(n = 50) {
        return this._entries.slice(-n);
    }

    clear() {
        this._entries = [];
        this._notify();
    }

    /** Export full log as JSON string (for sharing) */
    exportJSON() {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            entryCount: this._entries.length,
            entries: this._entries,
        }, null, 2);
    }

    /** Export full log as downloadable file */
    downloadLog() {
        const json = this.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `velvet-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // === SUBSCRIPTIONS (for React) ===

    subscribe(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    _notify() {
        this._listeners.forEach(fn => {
            try { fn(); } catch { }
        });
    }
}

const CATEGORY_STYLES = {
    system: 'color: #a78bfa; font-weight: bold',
    prompt: 'color: #34d399; font-weight: bold',
    api: 'color: #60a5fa; font-weight: bold',
    'api-response': 'color: #22d3ee',
    'api-error': 'color: #f87171; font-weight: bold',
    scene: 'color: #fbbf24',
    preset: 'color: #c084fc',
    'location-gen': 'color: #fb923c',
    'image-gen': 'color: #f472b6',
    nav: 'color: #94a3b8',
    info: 'color: #a1a1aa',
    warn: 'color: #fbbf24',
    error: 'color: #ef4444; font-weight: bold',
};

// Singleton
export const debugLogger = new DebugLogger();

// React hook  
export const useDebugLog = () => {
    const [, forceUpdate] = React.useState(0);
    React.useEffect(() => {
        return debugLogger.subscribe(() => forceUpdate(c => c + 1));
    }, []);
    return debugLogger;
};



