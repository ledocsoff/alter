import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../store/ToastContext';
import { getGallery, getGalleryImage, galleryImageUrl, deleteFromGallery, toggleGalleryStar, clearGallery } from '../../utils/storage';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { ImageIcon } from '../../components/Icons';

const ITEMS_PER_PAGE = 20;

const GalleryPanel = () => {
    const toast = useToast();
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | starred
    const [selectedItem, setSelectedItem] = useState(null); // full entry with prompt
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const scrollRef = useRef(null);

    // Load gallery page (metadata only — images loaded via URL)
    const loadGallery = useCallback(async (page = 1) => {
        setLoading(true);
        const data = await getGallery({
            page,
            limit: ITEMS_PER_PAGE,
            starred: filter === 'starred',
        });
        setItems(data.items || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
        setLoading(false);
    }, [filter]);

    useEffect(() => { loadGallery(1); }, [loadGallery]);

    // Allow parent to trigger refresh via custom event
    useEffect(() => {
        const handler = () => loadGallery(pagination.page);
        window.addEventListener('velvet:gallery-updated', handler);
        return () => window.removeEventListener('velvet:gallery-updated', handler);
    }, [loadGallery, pagination.page]);

    const handleSelect = async (item) => {
        // Fetch full entry including prompt and scene
        const full = await getGalleryImage(item.id);
        if (full) setSelectedItem(full);
    };

    const handleDelete = async (id) => {
        if (pendingDeleteId === id) {
            await deleteFromGallery(id);
            await loadGallery(pagination.page);
            if (selectedItem?.id === id) setSelectedItem(null);
            setPendingDeleteId(null);
            toast.success('Image supprimée');
        } else {
            setPendingDeleteId(id);
            setTimeout(() => setPendingDeleteId(null), 3000);
        }
    };

    const handleStar = async (id) => {
        await toggleGalleryStar(id);
        // Update local state optimistically
        setItems(prev => prev.map(g => g.id === id ? { ...g, starred: !g.starred } : g));
        if (selectedItem?.id === id) setSelectedItem(prev => prev ? { ...prev, starred: !prev.starred } : null);
    };

    const handleClear = () => setConfirmClear(true);

    const executeClear = async () => {
        await clearGallery();
        setItems([]);
        setPagination({ page: 1, total: 0, totalPages: 0 });
        setSelectedItem(null);
        setConfirmClear(false);
        toast.success('Galerie videe');
    };

    const handleDownload = (img) => {
        const a = document.createElement('a');
        a.href = galleryImageUrl(img.id);
        a.download = `velvet_${img.modelName || 'gen'}_${new Date(img.timestamp).toISOString().slice(0, 10)}.png`;
        a.click();
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const goToPage = (page) => {
        loadGallery(page);
        scrollRef.current?.scrollTo(0, 0);
    };

    // Loading state
    if (loading && items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Lightbox view
    if (selectedItem) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                {/* Back bar */}
                <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800/40">
                    <button onClick={() => setSelectedItem(null)} className="text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors">
                        &larr; Retour galerie
                    </button>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handleStar(selectedItem.id)}
                            className={`text-[14px] px-1.5 py-0.5 rounded transition-colors ${selectedItem.starred ? 'text-violet-400' : 'text-zinc-600 hover:text-violet-400'}`}
                        >
                            {selectedItem.starred ? '★' : '☆'}
                        </button>
                        <button
                            onClick={() => handleDownload(selectedItem)}
                            className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors"
                        >
                            Telecharger
                        </button>
                        {selectedItem.prompt && (
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(selectedItem.prompt);
                                    toast.success('Prompt copie');
                                }}
                                className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors"
                            >
                                Copier prompt
                            </button>
                        )}
                    </div>
                </div>
                {/* Image */}
                <div className="flex-1 overflow-auto custom-scrollbar p-3 flex flex-col gap-3">
                    <div className="flex-1 min-h-0 flex items-center justify-center bg-[#0a0a0c] rounded-xl border border-zinc-800/40 overflow-hidden">
                        <img
                            src={galleryImageUrl(selectedItem.id)}
                            alt="Generation"
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                    {/* Metadata */}
                    <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                        <div className="bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/40">
                            <span className="text-zinc-600 block">Modele</span>
                            <span className="text-zinc-300 font-medium">{selectedItem.modelName || '—'}</span>
                        </div>
                        <div className="bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/40">
                            <span className="text-zinc-600 block">Lieu</span>
                            <span className="text-zinc-300 font-medium">{selectedItem.locationName || '—'}</span>
                        </div>
                        <div className="bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/40">
                            <span className="text-zinc-600 block">Seed</span>
                            <span className="text-violet-400 font-mono font-medium">{selectedItem.seed || '—'}</span>
                        </div>
                        <div className="bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/40">
                            <span className="text-zinc-600 block">Date</span>
                            <span className="text-zinc-300 font-medium">{formatTime(selectedItem.timestamp)}</span>
                        </div>
                    </div>
                    {/* Scene details */}
                    {selectedItem.scene && Object.keys(selectedItem.scene).length > 0 && (
                        <div className="bg-zinc-900/80 rounded-lg px-3 py-2 border border-zinc-800/40 text-[10px]">
                            <span className="text-zinc-600 block mb-1">Scene</span>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedItem.scene.outfit && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">Tenue: {typeof selectedItem.scene.outfit === 'object' ? (selectedItem.scene.outfit.label || selectedItem.scene.outfit.value) : selectedItem.scene.outfit}</span>}
                                {selectedItem.scene.pose && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">Pose: {selectedItem.scene.pose}</span>}
                                {selectedItem.scene.expression && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">Expr: {selectedItem.scene.expression}</span>}
                                {selectedItem.scene.environment && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">Decor: {selectedItem.scene.environment}</span>}
                                {selectedItem.scene.lighting && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">Lumiere: {selectedItem.scene.lighting}</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Grid view
    return (
        <>
            <div className="h-full flex flex-col overflow-hidden">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-zinc-300">Galerie</span>
                        <span className="text-[10px] text-zinc-600">{pagination.total} image{pagination.total !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setFilter(filter === 'starred' ? 'all' : 'starred')}
                            className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${filter === 'starred' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-600 hover:text-zinc-300'}`}
                        >
                            Favoris
                        </button>
                        {pagination.total > 0 && (
                            <button
                                onClick={handleClear}
                                className="text-[10px] text-zinc-600 hover:text-red-400 px-1.5 py-0.5 rounded-md hover:bg-red-500/10 transition-colors"
                            >
                                Vider
                            </button>
                        )}
                    </div>
                </div>

                {/* Grid */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {items.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="mb-2 opacity-20"><ImageIcon size={32} /></div>
                                <p className="text-zinc-500 text-[12px] font-medium">
                                    {filter === 'starred' ? 'Aucun favori' : 'Aucune image'}
                                </p>
                                <p className="text-zinc-700 text-[11px] mt-0.5">
                                    {filter === 'starred' ? 'Marquez des images avec le bouton etoile' : 'Les generations seront sauvegardees ici'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                                {items.map(img => (
                                    <div
                                        key={img.id}
                                        onClick={() => handleSelect(img)}
                                        className="relative group cursor-pointer rounded-lg overflow-hidden border border-zinc-800/40 hover:border-zinc-600/60 transition-all aspect-[9/16]"
                                    >
                                        <img
                                            src={galleryImageUrl(img.id)}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="absolute bottom-0 left-0 right-0 p-1.5">
                                                <p className="text-[9px] text-zinc-300 truncate">{img.locationName}</p>
                                                <p className="text-[8px] text-zinc-500">{formatTime(img.timestamp)}</p>
                                            </div>
                                        </div>
                                        {/* Star & delete */}
                                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStar(img.id); }}
                                                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors ${img.starred ? 'text-violet-400 bg-black/50' : 'text-white/60 bg-black/40 hover:text-violet-400'}`}
                                            >
                                                {img.starred ? '★' : '☆'}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                                                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors ${pendingDeleteId === img.id ? 'text-red-400 bg-red-500/30' : 'text-white/60 bg-black/40 hover:text-red-400'}`}
                                            >
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                        {/* Starred indicator */}
                                        {img.starred && (
                                            <div className="absolute top-1 left-1 text-[10px] text-violet-400 group-hover:opacity-0 transition-opacity">★</div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-center gap-1.5 mt-3 pb-1">
                                    <button
                                        onClick={() => goToPage(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                    >
                                        Prec.
                                    </button>
                                    <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
                                        {pagination.page}/{pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => goToPage(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                    >
                                        Suiv.
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <ConfirmModal
                isOpen={confirmClear}
                title="Vider la galerie ?"
                message="Toutes les images seront définitivement supprimées."
                confirmLabel="Vider"
                onConfirm={executeClear}
                onCancel={() => setConfirmClear(false)}
            />
        </>
    );
};

export default GalleryPanel;
