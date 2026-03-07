import React, { useRef } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';
import { compressImage } from '../../utils/imageCompression';

const MAX_REFS = 1;

const OutfitRefUpload = () => {
    const { outfitRefImages, setOutfitRefImages } = useStudio();
    const toast = useToast();
    const inputRef = useRef(null);

    const handleFiles = async (files) => {
        const validFiles = Array.from(files)
            .filter(f => f.type.startsWith('image/'))
            .slice(0, MAX_REFS); // We replace the current one if dropped again

        if (validFiles.length === 0) return;

        try {
            const newImages = await Promise.all(validFiles.map(async (f) => {
                const compressed = await compressImage(f);
                return {
                    base64: compressed.base64,
                    mimeType: compressed.mimeType,
                    dataUrl: `data:${compressed.mimeType};base64,${compressed.base64}`
                };
            }));
            setOutfitRefImages(newImages); // Always replace with the exact 1 new image
            toast.success(`Tenue de référence ajoutée`);
        } catch {
            toast.error('Erreur lecture image');
        }
    };


    const handleRemove = (index) => {
        setOutfitRefImages([]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div className="flex items-center gap-2">
            {outfitRefImages.map((img, i) => (
                <div key={i} className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg bg-indigo-500/[0.08] border border-indigo-500/20">
                    <img
                        src={img.dataUrl}
                        alt={`Tenue`}
                        className="w-6 h-6 rounded border border-white/10 object-cover shrink-0"
                    />
                    <span className="text-[10px] font-medium text-indigo-300">Vêtement prêt pour l'IA</span>
                    <button
                        onClick={() => handleRemove(i)}
                        className="ml-1 w-5 h-5 rounded hover:bg-white/10 text-indigo-400 hover:text-red-400 flex items-center justify-center transition-colors"
                        title="Retirer la tenue"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            ))}

            {/* Upload button */}
            {outfitRefImages.length < MAX_REFS && (
                <button
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="h-7 px-2.5 shrink-0 rounded-lg flex items-center justify-center gap-1.5 border border-dashed border-indigo-500/40 hover:border-indigo-500/80 bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08] transition-colors"
                >
                    <span className="text-[12px]">👕</span>
                    <span className="text-[10px] font-medium text-indigo-300/80">Modeleur de tenue (photo)</span>
                </button>
            )}

            <label htmlFor="outfit-image-upload" className="sr-only">Upload de tenue</label>
            <input
                id="outfit-image-upload"
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
        </div>
    );
};

export default OutfitRefUpload;
