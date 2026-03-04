import { useEffect, useRef } from 'react';

/**
 * Modal de confirmation pour les actions destructives.
 * Props:
 *   isOpen: boolean
 *   title: string
 *   message: string
 *   confirmLabel: string (default "Supprimer")
 *   cancelLabel: string (default "Annuler")
 *   variant: 'danger' | 'warning' (default 'danger')
 *   onConfirm: () => void
 *   onCancel: () => void
 */
const ConfirmModal = ({ isOpen, title, message, confirmLabel = 'Supprimer', cancelLabel = 'Annuler', variant = 'danger', onConfirm, onCancel }) => {
    const cancelRef = useRef(null);

    useEffect(() => {
        if (isOpen) cancelRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'fadeInScale 0.15s ease-out' }}
            >
                <div className={`w-11 h-11 mx-auto mb-4 rounded-xl flex items-center justify-center ${isDanger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                    <span className="text-xl">{isDanger ? '🗑️' : '⚠️'}</span>
                </div>
                <h3 className="text-base font-bold text-zinc-100 text-center mb-1">{title}</h3>
                <p className="text-sm text-zinc-500 text-center mb-6">{message}</p>
                <div className="flex gap-2">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        className="flex-1 h-9 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${isDanger
                            ? 'bg-red-600 text-white hover:bg-red-500'
                            : 'bg-amber-600 text-white hover:bg-amber-500'
                            }`}
                    >
                        {confirmLabel}
                    </button>
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

export default ConfirmModal;
