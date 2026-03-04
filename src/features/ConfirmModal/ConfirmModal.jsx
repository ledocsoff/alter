import { useEffect, useRef } from 'react';
import { TrashIcon } from '../../components/Icons';

/**
 * Modal de confirmation pour les actions destructives.
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
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
            <div
                className="relative bg-[#141416] border border-white/[0.06] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center ${isDanger ? 'bg-red-500/10' : 'bg-violet-500/10'}`}>
                    {isDanger
                        ? <TrashIcon size={22} className="text-red-400" />
                        : <span className="text-xl">⚠️</span>
                    }
                </div>
                <h3 className="text-base font-bold text-zinc-100 text-center mb-1">{title}</h3>
                <p className="text-sm text-zinc-500 text-center mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-2">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        className="flex-1 h-10 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all ${isDanger
                            ? 'bg-red-600 text-white hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20'
                            : 'bg-violet-600 text-white hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/20'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
