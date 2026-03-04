import React, { useState, useCallback } from 'react';

// Render JSON with editable null fields
const EditableMatrix = ({ matrix, onChange }) => {
    const [editingPath, setEditingPath] = useState(null);
    const [editValue, setEditValue] = useState('');

    const handleStartEdit = (path) => {
        setEditingPath(path);
        setEditValue('');
    };

    const handleCommit = useCallback(() => {
        if (!editingPath || !editValue.trim()) {
            setEditingPath(null);
            return;
        }
        onChange(editingPath, editValue.trim());
        setEditingPath(null);
        setEditValue('');
    }, [editingPath, editValue, onChange]);

    const renderValue = (value, path, depth = 0) => {
        if (value === null) {
            if (editingPath === path) {
                return (
                    <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCommit}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') setEditingPath(null); }}
                        className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono rounded px-1.5 py-0.5 outline-none focus:border-amber-400 w-48"
                        placeholder="Taper une valeur..."
                    />
                );
            }
            return (
                <span
                    onClick={() => handleStartEdit(path)}
                    className="text-zinc-600 cursor-pointer hover:text-amber-400 hover:bg-amber-500/5 rounded px-1 py-0.5 transition-colors group"
                    title="Cliquer pour remplir"
                >
                    null <span className="text-[9px] text-zinc-700 group-hover:text-amber-500">✏️</span>
                </span>
            );
        }

        if (typeof value === 'string') {
            // Truncate very long strings for display
            const display = value.length > 120 ? value.slice(0, 120) + '...' : value;
            return <span className="text-emerald-400/80">"{display}"</span>;
        }

        if (typeof value === 'number') {
            return <span className="text-cyan-400">{value}</span>;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="text-zinc-500">[]</span>;
            return (
                <span>
                    <span className="text-zinc-500">[</span>
                    {value.map((item, i) => (
                        <span key={i}>
                            {i > 0 && <span className="text-zinc-600">, </span>}
                            {renderValue(item, `${path}[${i}]`, depth)}
                        </span>
                    ))}
                    <span className="text-zinc-500">]</span>
                </span>
            );
        }

        if (typeof value === 'object') {
            const entries = Object.entries(value);
            const indent = '  '.repeat(depth + 1);
            const closingIndent = '  '.repeat(depth);
            return (
                <span>
                    <span className="text-zinc-500">{'{'}</span>
                    {entries.map(([key, val], i) => (
                        <div key={key} style={{ marginLeft: `${(depth + 1) * 12}px` }}>
                            <span className="text-violet-400/80">"{key}"</span>
                            <span className="text-zinc-600">: </span>
                            {renderValue(val, `${path}.${key}`, depth + 1)}
                            {i < entries.length - 1 && <span className="text-zinc-600">,</span>}
                        </div>
                    ))}
                    <div style={{ marginLeft: `${depth * 12}px` }}>
                        <span className="text-zinc-500">{'}'}</span>
                    </div>
                </span>
            );
        }

        return <span className="text-zinc-400">{String(value)}</span>;
    };

    return (
        <div className="text-[11px] font-mono leading-relaxed">
            {renderValue(matrix, '$', 0)}
        </div>
    );
};

export default EditableMatrix;
