import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../store/ToastContext';
import { CameraIcon } from '../../components/Icons';
import { uploadLocationRefs, getLocationRefs, deleteLocationRef, locationRefImageUrl } from '../../utils/storage';

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

const LocationRefUpload = ({ locationId }) => {
    const toast = useToast();
    const inputRef = useRef(null);
    const [refs, setRefs] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Load existing refs when locationId changes
    useEffect(() => {
        if (!locationId) { setRefs([]); return; }
        getLocationRefs(locationId).then(setRefs);
    }, [locationId]);

    const handleFiles = async (files) => {
        const validFiles = Array.from(files)
            .filter(f => f.type.startsWith('image/'))
            .slice(0, MAX_REFS - refs.length);

        if (validFiles.length === 0) return;

        setUploading(true);
        try {
            const photos = await Promise.all(validFiles.map(async f => {
                const { base64, mimeType } = await fileToBase64(f);
                return { base64, mimeType };
            }));
            const result = await uploadLocationRefs(locationId, photos);
            if (result?.ok) {
                toast.success(`${result.added} photo${result.added > 1 ? 's' : ''} de lieu ajoutée${result.added > 1 ? 's' : ''}`);
                // Reload refs from server
                const updated = await getLocationRefs(locationId);
                setRefs(updated);
            } else {
                toast.error('Erreur upload');
            }
        } catch {
            toast.error('Erreur lecture image');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async (refId) => {
        const result = await deleteLocationRef(locationId, refId);
        if (result?.ok) {
            setRefs(prev => prev.filter(r => r.id !== refId));
            toast.info('Photo de lieu supprimée');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    if (!locationId) return null;

    return (
        <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                📷 Photos de référence du lieu <span className="text-violet-400/60 normal-case font-normal">ancrage visuel</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
                {/* Existing ref thumbnails */}
                {refs.map(ref => (
                    <div key={ref.id} className="relative group">
                        <img
                            src={ref.imageUrl || locationRefImageUrl(locationId, ref.id)}
                            alt="Ref lieu"
                            className="w-16 h-16 rounded-lg object-cover border border-white/[0.08] ring-1 ring-violet-500/10"
                        />
                        <button
                            onClick={() => handleRemove(ref.id)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none shadow-lg"
                        >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                ))}

                {/* Upload zone */}
                {refs.length < MAX_REFS && (
                    <button
                        onClick={() => inputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        disabled={uploading}
                        className={`w-16 h-16 rounded-lg border-2 border-dashed border-white/[0.08] hover:border-violet-500/30 bg-white/[0.015] hover:bg-violet-500/[0.03] flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${uploading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {uploading ? (
                            <div className="w-4 h-4 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
                        ) : (
                            <>
                                <CameraIcon size={14} className="text-zinc-600" />
                                <span className="text-[8px] text-zinc-600 font-medium">{refs.length}/{MAX_REFS}</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">Photos réelles du lieu pour guider l'IA sur le décor et l'ambiance.</p>

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

export default LocationRefUpload;
