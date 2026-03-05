import React, { useRef } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';
import { CameraIcon } from '../../components/Icons';

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
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-teal-500/[0.06] border border-teal-500/15">
            <span className="text-[9px] text-teal-400/70 font-medium">👤</span>
            {/* Thumbnails */}
            {referenceImages.map((img, i) => (
                <div key={i} className="relative group">
                    <img
                        src={img.dataUrl}
                        alt={`Ref ${i + 1}`}
                        className="w-6 h-6 rounded object-cover border border-teal-500/20"
                    />
                    <button
                        onClick={() => handleRemove(i)}
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none shadow"
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
                    className="w-6 h-6 rounded flex items-center justify-center border border-dashed border-teal-500/20 hover:border-teal-500/40 bg-teal-500/[0.04] hover:bg-teal-500/[0.08] transition-colors"
                    title="Ajouter une ref modèle"
                >
                    <CameraIcon size={10} className="text-teal-400/50" />
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                aria-label="Ajouter une photo de référence"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
        </div>
    );
};

export default ReferenceUpload;
