// ============================================
// IMAGE COMPRESSION — redimensionne côté client avant upload
// ============================================

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;

/**
 * Compresse une image (File ou Blob) à max 1024px de côté, JPEG 85%.
 * Retourne { base64, mimeType, file }.
 */
export const compressImage = (file, maxDim = MAX_DIMENSION, quality = JPEG_QUALITY) => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Compression timeout (10s)')), 10000);
        const done = (result) => { clearTimeout(timeout); resolve(result); };
        const fail = (err) => { clearTimeout(timeout); reject(err); };
        const reader = new FileReader();
        reader.onerror = () => fail(new Error('Erreur lecture fichier'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => fail(new Error('Image invalide'));
            img.onload = () => {
                let { width, height } = img;

                // Skip compression if already small enough
                if (width <= maxDim && height <= maxDim && file.size < 500 * 1024) {
                    const base64 = reader.result.split(',')[1];
                    done({
                        base64,
                        mimeType: file.type || 'image/jpeg',
                        file,
                        compressed: false,
                        originalSize: file.size,
                        compressedSize: file.size,
                    });
                    return;
                }

                // Calculate new dimensions
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) { fail(new Error('Compression échouée')); return; }
                        const blobReader = new FileReader();
                        blobReader.onload = () => {
                            const base64 = blobReader.result.split(',')[1];
                            done({
                                base64,
                                mimeType: 'image/jpeg',
                                file: new File([blob], file.name?.replace(/\.\w+$/, '.jpg') || 'photo.jpg', { type: 'image/jpeg' }),
                                compressed: true,
                                originalSize: file.size,
                                compressedSize: blob.size,
                            });
                        };
                        blobReader.readAsDataURL(blob);
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
};
