import { useEffect } from 'react';

const SHORTCUTS = [
    {
        section: 'Studio de Generation',
        items: [
            { keys: ['⌘', 'G'], label: 'Generer une image' },
            { keys: ['⌘', 'R'], label: 'Randomiser la scene' },
            { keys: ['⌘', 'C'], label: 'Copier le prompt (vue Image)' },
        ],
    },
    {
        section: 'Navigation',
        items: [
            { keys: ['Escape'], label: 'Fermer modale / annuler' },
            { keys: ['Enter'], label: 'Confirmer (formulaires)' },
        ],
    },
    {
        section: 'Application',
        items: [
            { keys: ['?'], label: 'Afficher ces raccourcis' },
        ],
    },
];

const ShortcutsModal = ({ isOpen, onClose }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'fadeInScale 0.15s ease-out' }}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-zinc-100">Raccourcis clavier</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-sm"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-5">
                    {SHORTCUTS.map((section) => (
                        <div key={section.section}>
                            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">
                                {section.section}
                            </h4>
                            <div className="space-y-1.5">
                                {section.items.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between py-1">
                                        <span className="text-sm text-zinc-300">{item.label}</span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((key, i) => (
                                                <span key={i}>
                                                    <kbd className="min-w-[24px] h-6 px-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-300 flex items-center justify-center">
                                                        {key}
                                                    </kbd>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-800/50 text-center">
                    <span className="text-[11px] text-zinc-600">Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400">Esc</kbd> pour fermer</span>
                </div>
            </div>
            <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ShortcutsModal;
