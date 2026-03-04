import React, { useRef } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';

const MAX_REFS = 3;

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: file.type, dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const ReferenceUpload = () => {
    const { referenceImages, setReferenceImages } = useStudio();
    const toast = useToast();
    const inputRef = useRef(null);

    const handleFiles = async (files) => {
        const validFiles = Array.from(files)
            .filter(f => f.type.startsWith('image/'))
            .slice(0, MAX_REFS - referenceImages.length);

        if (validFiles.length === 0) return;

        try {
            const newImages = await Promise.all(validFiles.map(fileToBase64));
            setReferenceImages(prev => [...prev, ...newImages].slice(0, MAX_REFS));
            toast.success(`${newImages.length} ref${newImages.length > 1 ? 's' : ''} ajoutee${newImages.length > 1 ? 's' : ''}`);
        } catch {
            toast.error('Erreur lecture image');
        }
    };

    const handleRemove = (index) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div className="flex items-center gap-1.5">
            {/* Thumbnails */}
            {referenceImages.map((img, i) => (
                <div key={i} className="relative group">
                    <img
                        src={img.dataUrl}
                        alt={`Ref ${i + 1}`}
                        className="w-7 h-7 rounded-md object-cover border border-emerald-500/30 ring-1 ring-emerald-500/10"
                    />
                    <button
                        onClick={() => handleRemove(i)}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                    >
                        ×
                    </button>
                </div>
            ))}

            {/* Upload button */}
            {referenceImages.length < MAX_REFS && (
                <button
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 hover:border-emerald-500/30"
                    title="Uploader une image de reference pour la coherence du visage"
                >
                    <span>📷</span>
                    <span>Ref{referenceImages.length > 0 ? ` (${referenceImages.length}/${MAX_REFS})` : ''}</span>
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
        </div>
    );
};

export default ReferenceUpload;
