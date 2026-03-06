import { useEffect } from 'react';
import { CloseIcon } from '../../components/Icons';

const SHORTCUTS = [
    {
        section: 'Studio de Generation',
        items: [
            { keys: ['⌘', 'G'], label: 'Générer une image' },
            { keys: ['⌘', 'R'], label: 'Randomiser la scène' },
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
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
            <div
                className="relative bg-[#141416] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-zinc-100">Raccourcis clavier</h3>
                    <button onClick={onClose} className="alter-btn-delete">
                        <CloseIcon size={14} />
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
                                                <kbd key={i} className="min-w-[24px] h-6 px-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-300 flex items-center justify-center">
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.04] text-center">
                    <span className="text-[11px] text-zinc-600">Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-zinc-400">Esc</kbd> pour fermer</span>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsModal;
