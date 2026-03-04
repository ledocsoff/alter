import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { useStudio } from '../../store/StudioContext';
import { useToast } from '../../store/ToastContext';
import { getApiKey, saveToGallery, savePromptToHistory } from '../../utils/storage';
import { generateImage } from '../../utils/googleAI';

const MAX_HISTORY_TURNS = 5; // Garder les 5 derniers échanges pour la cohérence

const ImagePreview = forwardRef(({ onRequestApiKey, galleryMeta = {}, onGalleryUpdate }, ref) => {
  const { anchorMatrix, generatedPrompt, referenceImages } = useStudio();
  const toast = useToast();

  const [status, setStatus] = useState('idle');
  const [currentImage, setCurrentImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionImages, setSessionImages] = useState([]);
  const [genCount, setGenCount] = useState(0);
  const [lastGenTime, setLastGenTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null); // { current, total }
  const timerRef = useRef(null);
  const galleryMetaRef = useRef(galleryMeta);
  galleryMetaRef.current = galleryMeta;

  // Historique de conversation multi-turn pour cohérence visuelle
  // Chaque entrée = { role: 'user'|'model', parts: [...] }
  const [conversationHistory, setConversationHistory] = useState([]);

  useEffect(() => {
    if (status === 'generating') {
      const start = Date.now();
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  useImperativeHandle(ref, () => ({ handleGenerate, handleGenerateWithPrompt, handleBatchGenerate }));

  const handleGenerateWithPrompt = useCallback(async (customPrompt) => {
    const apiKey = getApiKey();
    if (!apiKey) { onRequestApiKey?.(); return; }

    const now = Date.now();
    if (now - lastGenTime < 2000) { toast.info('Patientez avant de regenerer'); return; }

    setStatus('generating');
    setErrorMsg('');
    setElapsed(0);
    setLastGenTime(now);

    const promptToSend = customPrompt || generatedPrompt;

    // Build reference anchor if images are uploaded
    const refAnchor = referenceImages.length > 0 ? [{
      role: 'user',
      parts: [
        { text: 'REFERENCE IMAGES — This is the EXACT person to reproduce. Match this face, body proportions, skin tone, and features precisely in EVERY generation. This person\'s identity is LOCKED.' },
        ...referenceImages.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
      ],
    }] : [];

    try {
      const aspectRatio = anchorMatrix?.aspect_ratio_and_output?.ratio === '1:1' ? '1:1' : '9:16';
      const fullHistory = [...refAnchor, ...conversationHistory];
      const result = await generateImage(apiKey, promptToSend, aspectRatio, fullHistory);

      const img = { ...result, id: `img_${Date.now()}`, timestamp: Date.now(), prompt: promptToSend };
      setCurrentImage(img);
      setSessionImages(prev => [img, ...prev].slice(0, 20));
      setGenCount(prev => prev + 1);
      setStatus('done');

      // Auto-save to gallery
      try {
        saveToGallery(
          { base64: result.imageBase64, mimeType: result.mimeType },
          { ...galleryMetaRef.current, prompt: promptToSend }
        );
      } catch { /* silent — gallery save is best-effort */ }

      // Auto-save prompt to history
      try {
        savePromptToHistory(promptToSend, galleryMetaRef.current);
      } catch { /* silent */ }

      // Notify parent for gallery refresh
      onGalleryUpdate?.();

      setConversationHistory(prev => {
        const updated = [
          ...prev,
          { role: 'user', parts: [{ text: promptToSend }] },
          { role: 'model', parts: result.modelParts },
        ];
        if (updated.length > MAX_HISTORY_TURNS * 2) {
          return updated.slice(-MAX_HISTORY_TURNS * 2);
        }
        return updated;
      });
      return img;
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
      toast.error(err.message);
      return null;
    }
  }, [anchorMatrix, generatedPrompt, lastGenTime, onRequestApiKey, toast, conversationHistory]);

  const handleGenerate = useCallback(async () => {
    return handleGenerateWithPrompt(generatedPrompt);
  }, [handleGenerateWithPrompt, generatedPrompt]);

  const handleBatchGenerate = useCallback(async (count = 3, getVariantPrompt) => {
    setBatchProgress({ current: 0, total: count });
    const savedLastGen = lastGenTime;
    setLastGenTime(0); // Bypass cooldown during batch
    for (let i = 0; i < count; i++) {
      setBatchProgress({ current: i + 1, total: count });
      const prompt = getVariantPrompt ? getVariantPrompt(i) : generatedPrompt;
      const result = await handleGenerateWithPrompt(prompt);
      if (!result) break; // stop on error
      if (i < count - 1) await new Promise(r => setTimeout(r, 2000)); // respect API rate limit
    }
    setBatchProgress(null);
    setLastGenTime(Date.now()); // Restore cooldown after batch
    toast.success(`Batch termine — ${count} image(s) generee(s)`);
  }, [handleGenerateWithPrompt, generatedPrompt, toast, lastGenTime]);

  const handleDownload = useCallback(() => {
    if (!currentImage) return;
    const ext = currentImage.mimeType?.includes('jpeg') ? 'jpg' : 'png';
    const a = document.createElement('a');
    a.href = currentImage.dataUrl;
    a.download = `velvet-${Date.now()}.${ext}`;
    a.click();
    toast.success('Image telechargee');
  }, [currentImage, toast]);

  const handleCopyImage = useCallback(async () => {
    if (!currentImage) return;
    try {
      const res = await fetch(currentImage.dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success('Image copiee');
    } catch { toast.error("Impossible de copier l'image"); }
  }, [currentImage, toast]);

  const handleNewSession = () => {
    setConversationHistory([]);
    setSessionImages([]);
    setCurrentImage(null);
    setStatus('idle');
    setGenCount(0);
    toast.info('Nouvelle session — coherence reinitalisee');
  };

  const hasApiKey = !!getApiKey();
  const turnCount = Math.floor(conversationHistory.length / 2);

  return (
    <div className="flex flex-col h-full overflow-hidden gap-2">

      {/* SESSION BAR */}
      {turnCount > 0 && (
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/40">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[11px] text-zinc-400 font-medium">
              Session active — {turnCount} generation{turnCount > 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-zinc-600">coherence liee</span>
          </div>
          <button
            onClick={handleNewSession}
            className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors font-medium"
          >
            Nouvelle session
          </button>
        </div>
      )}

      {/* IMAGE CANVAS — hauteur contrainte */}
      <div className="flex-1 relative rounded-xl overflow-hidden bg-[#0a0a0c] border border-zinc-800/40 min-h-0 max-h-[60vh] group">

        {/* EMPTY STATE */}
        {status === 'idle' && !currentImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              </div>
              {hasApiKey ? (
                <>
                  <p className="text-zinc-400 text-[13px] font-medium mb-1">Pret a generer</p>
                  <p className="text-zinc-600 text-[11px] mb-3">Chaque generation dans la meme session renforce la coherence</p>
                  <button
                    onClick={handleGenerate}
                    className="h-9 px-5 rounded-lg text-[12px] font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/10 active:scale-[0.97]"
                  >
                    Generer
                  </button>
                  <p className="text-zinc-800 text-[10px] mt-2 font-mono">Cmd+G</p>
                </>
              ) : (
                <>
                  <p className="text-zinc-400 text-[13px] font-medium mb-1">API non configuree</p>
                  <button
                    onClick={onRequestApiKey}
                    className="h-9 px-5 rounded-lg text-[12px] font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    Configurer
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* GENERATING */}
        {status === 'generating' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0c]">
            <div className="text-center">
              {batchProgress && (
                <p className="text-[11px] text-indigo-400 font-semibold mb-2">
                  Batch {batchProgress.current}/{batchProgress.total}
                </p>
              )}
              <div className="relative w-12 h-12 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-orange-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <p className="text-zinc-400 text-[13px] font-medium mb-0.5">Generation...</p>
              <span className="text-amber-500/60 text-[12px] font-mono tabular-nums">{elapsed}s</span>
            </div>
          </div>
        )}

        {/* ERROR */}
        {status === 'error' && !currentImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-xs px-4">
              <p className="text-red-400/80 text-[13px] font-medium mb-1">Erreur</p>
              <p className="text-zinc-500 text-[11px] mb-3 leading-relaxed">{errorMsg}</p>
              <button onClick={handleGenerate} className="text-[11px] text-amber-500 hover:text-amber-400 font-medium">Reessayer</button>
            </div>
          </div>
        )}

        {/* IMAGE */}
        {currentImage && (
          <>
            <img
              src={currentImage.dataUrl}
              alt="Generated"
              onClick={() => setIsZoomed(true)}
              className="w-full h-full object-contain cursor-zoom-in"
            />
            {/* FLOATING TOOLBAR */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={handleGenerate}
                disabled={status === 'generating'}
                className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
              >
                Regenerer
              </button>
              <div className="w-px h-3 bg-white/10"></div>
              {sessionImages.length >= 2 && (
                <>
                  <button
                    onClick={() => setCompareMode(true)}
                    className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                  >
                    Comparer
                  </button>
                  <div className="w-px h-3 bg-white/10"></div>
                </>
              )}
              <button onClick={handleCopyImage} className="text-[10px] font-medium text-zinc-300 hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors">Copier</button>
              <button onClick={handleDownload} className="text-[10px] font-medium text-zinc-300 hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors">Sauver</button>
            </div>

            {/* COMPARISON MODE */}
            {compareMode && sessionImages.length >= 2 && (
              <div
                className="absolute inset-0 z-10 bg-[#0a0a0c] flex cursor-pointer"
                onClick={() => setCompareMode(false)}
              >
                <div className="flex-1 flex flex-col items-center justify-center p-2 border-r border-zinc-800/40">
                  <img src={sessionImages[1].dataUrl} alt="Previous" className="max-h-full max-w-full object-contain rounded-lg" />
                  <span className="text-[10px] text-zinc-600 mt-1">Precedente</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-2">
                  <img src={sessionImages[0].dataUrl} alt="Current" className="max-h-full max-w-full object-contain rounded-lg" />
                  <span className="text-[10px] text-zinc-600 mt-1">Actuelle</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* THUMBNAILS */}
      {sessionImages.length > 0 && (
        <div className="shrink-0 flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1 overflow-x-auto custom-scrollbar min-w-0 py-0.5">
            {sessionImages.map((img) => (
              <button
                key={img.id}
                onClick={() => { setCurrentImage(img); setStatus('done'); }}
                className={`w-9 h-9 rounded-md overflow-hidden shrink-0 border transition-all ${currentImage?.id === img.id
                  ? 'border-amber-500/50 ring-1 ring-amber-500/20'
                  : 'border-zinc-800/60 opacity-40 hover:opacity-100 hover:border-zinc-600'
                  }`}
              >
                <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <span className="text-[10px] text-zinc-700 font-medium tabular-nums shrink-0">{genCount}</span>
        </div>
      )}

      {/* ZOOM */}
      {isZoomed && currentImage && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center cursor-zoom-out" onClick={() => setIsZoomed(false)}>
          <img src={currentImage.dataUrl} alt="Zoomed" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="h-8 px-3 rounded-lg text-[12px] font-medium bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-colors">Telecharger</button>
            <button onClick={() => setIsZoomed(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
      )}
    </div>
  );
});

export default ImagePreview;
