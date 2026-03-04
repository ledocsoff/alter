import React, { useState, useMemo } from 'react';
import { useToast } from '../../store/ToastContext';
import { getGallery, deleteFromGallery, toggleGalleryStar, clearGallery } from '../../utils/storage';

const GalleryPanel = () => {
    const toast = useToast();
    const [gallery, setGallery] = useState(() => getGallery());
    const [filter, setFilter] = useState('all'); // all | starred
    const [selectedId, setSelectedId] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const filtered = useMemo(() => {
        if (filter === 'starred') return gallery.filter(g => g.starred);
        return gallery;
    }, [gallery, filter]);

    const selected = useMemo(() => gallery.find(g => g.id === selectedId), [gallery, selectedId]);

    const handleDelete = (id) => {
        if (pendingDeleteId === id) {
            setGallery(deleteFromGallery(id));
            if (selectedId === id) setSelectedId(null);
            setPendingDeleteId(null);
            toast.success('Image supprimee');
        } else {
            setPendingDeleteId(id);
            setTimeout(() => setPendingDeleteId(null), 3000);
        }
    };

    const handleStar = (id) => {
        setGallery(toggleGalleryStar(id));
    };

    const handleClear = () => {
        if (window.confirm('Supprimer toute la galerie ?')) {
            setGallery(clearGallery());
            setSelectedId(null);
            toast.success('Galerie videe');
        }
    };

    const handleDownload = (img) => {
        const a = document.createElement('a');
        a.href = `data:${img.mimeType};base64,${img.base64}`;
        a.download = `nana_${img.modelName || 'gen'}_${new Date(img.timestamp).toISOString().slice(0, 10)}.png`;
        a.click();
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    // Lightbox view
    if (selected) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                {/* Back bar */}
                <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800/40">
                    <button onClick={() => setSelectedId(null)} className="text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors">
                        &larr; Retour galerie
                    </button>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handleStar(selected.id)}
                            className={`text-[14px] px-1.5 py-0.5 rounded transition-colors ${selected.starred ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-400'}`}
                        >
                            {selected.starred ? '★' : '☆'}
                        </button>
                        <button
                            onClick={() => handleDownload(selected)}
                            className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors"
                        >
                            ↓ Telecharger
                        </button>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(selected.prompt);
                                toast.success('Prompt copie');
                            }}
                            className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors"
                        >
                            Copier prompt
                        </button>
                    </div>
                </div>
                {/* Image */}
                <div className="flex-1 overflow-auto custom-scrollbar p-3 flex flex-col gap-3">
                    <div className="flex-1 min-h-0 flex items-center justify-center bg-[#0a0a0c] rounded-xl border border-zinc-800/40 overflow-hidden">
                        <img
                            src={`data:${selected.mimeType};base64,${selected.base64}`}
                            alt="Generation"
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                    {/* Metadata */}
                    <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                        <div className="bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/40">
                            <span className="text-zinc-600 block">Modele</span>
                            <span className="text-zinc-300 font-medium">{selected.modelName || '—'}</span>
                        </div>
                        <div className="bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/40">
                            <span className="text-zinc-600 block">Lieu</span>
                            <span className="text-zinc-300 font-medium">{selected.locationName || '—'}</span>
                        </div>
                        <div className="bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/40">
                            <span className="text-zinc-600 block">Seed</span>
                            <span className="text-amber-400 font-mono font-medium">{selected.seed || '—'}</span>
                        </div>
                        <div className="bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/40">
                            <span className="text-zinc-600 block">Date</span>
                            <span className="text-zinc-300 font-medium">{formatTime(selected.timestamp)}</span>
                        </div>
                    </div>
                    {/* Scene details */}
                    {selected.scene && Object.keys(selected.scene).length > 0 && (
                        <div className="bg-zinc-900/80 rounded-lg px-3 py-2 border border-zinc-800/40 text-[10px]">
                            <span className="text-zinc-600 block mb-1">Scene</span>
                            <div className="flex flex-wrap gap-1.5">
                                {selected.scene.outfit && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">👗 {typeof selected.scene.outfit === 'object' ? (selected.scene.outfit.label || selected.scene.outfit.value) : selected.scene.outfit}</span>}
                                {selected.scene.pose && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">🧍 {selected.scene.pose}</span>}
                                {selected.scene.expression && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">😊 {selected.scene.expression}</span>}
                                {selected.scene.environment && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">🏠 {selected.scene.environment}</span>}
                                {selected.scene.lighting && <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">💡 {selected.scene.lighting}</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Grid view
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800/40">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-zinc-300">Galerie</span>
                    <span className="text-[10px] text-zinc-600">{gallery.length} image{gallery.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setFilter(filter === 'starred' ? 'all' : 'starred')}
                        className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${filter === 'starred' ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-600 hover:text-zinc-300'}`}
                    >
                        ★ Favoris
                    </button>
                    {gallery.length > 0 && (
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {filtered.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-3xl mb-2 opacity-20">🖼️</div>
                            <p className="text-zinc-500 text-[12px] font-medium">
                                {filter === 'starred' ? 'Aucun favori' : 'Aucune image'}
                            </p>
                            <p className="text-zinc-700 text-[11px] mt-0.5">
                                {filter === 'starred' ? 'Marquez des images avec ★' : 'Les generations seront sauvegardees ici'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {filtered.map(img => (
                            <div
                                key={img.id}
                                onClick={() => setSelectedId(img.id)}
                                className="relative group cursor-pointer rounded-lg overflow-hidden border border-zinc-800/40 hover:border-zinc-600/60 transition-all aspect-[9/16]"
                            >
                                <img
                                    src={`data:${img.mimeType};base64,${img.base64}`}
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
                                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors ${img.starred ? 'text-amber-400 bg-black/50' : 'text-white/60 bg-black/40 hover:text-amber-400'}`}
                                    >
                                        {img.starred ? '★' : '☆'}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors ${pendingDeleteId === img.id ? 'text-red-400 bg-red-500/30' : 'text-white/60 bg-black/40 hover:text-red-400'}`}
                                    >
                                        ×
                                    </button>
                                </div>
                                {/* Starred indicator */}
                                {img.starred && (
                                    <div className="absolute top-1 left-1 text-[10px] text-amber-400 group-hover:opacity-0 transition-opacity">★</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GalleryPanel;
