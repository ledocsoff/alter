import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { saveModelData, getSavedModels, getApiKey } from '../utils/storage';
import { extractModelFromPhotos } from '../utils/googleAI';
import { DEFAULT_MODEL } from '../constants/modelOptions';
import ModelTemplateModal from '../features/ModelTemplateModal/ModelTemplateModal';

const ModelEditorShell = ({ mode }) => {
  const navigate = useNavigate();
  const { modelId } = useParams();
  const { model, setModel, allModelsDatabase, setAllModelsDatabase } = useStudio();
  const toast = useToast();

  const [modelName, setModelName] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [inputMode, setInputMode] = useState('json'); // 'json' | 'photo'
  const [photos, setPhotos] = useState([]); // { file, preview, base64, mimeType }
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef(null);

  // JSON validation
  const jsonStatus = useMemo(() => {
    if (!jsonText.trim()) return { valid: false, empty: true, error: null, parsed: null };
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { valid: false, empty: false, error: 'Le JSON doit etre un objet {}', parsed: null };
      }
      return { valid: true, empty: false, error: null, parsed };
    } catch (e) {
      return { valid: false, empty: false, error: e.message, parsed: null };
    }
  }, [jsonText]);

  // Build JSON text from model traits (excluding meta fields)
  const modelToJsonText = (modelData) => {
    const { id, name, accounts, ...traits } = modelData;
    return JSON.stringify(traits, null, 2);
  };

  useEffect(() => {
    if (mode === 'edit' && modelId) {
      const dbModels = getSavedModels();
      const existingModel = dbModels.find(m => m.id === modelId);
      if (existingModel) {
        setModelName(existingModel.name);
        const { id, accounts, ...modelFeatures } = existingModel;
        setModel({ ...modelFeatures, name: existingModel.name });
        setJsonText(modelToJsonText(existingModel));
      }
    } else {
      setModel(DEFAULT_MODEL);
      setModelName('');
      setJsonText('');
    }
  }, [mode, modelId, setModel]);

  const handleSave = () => {
    if (!modelName.trim()) {
      toast.error("Donnez un nom a cette influenceuse.");
      return;
    }

    if (!jsonStatus.valid) {
      toast.error("Le JSON est invalide. Corrigez-le avant de sauvegarder.");
      return;
    }

    const id = mode === 'edit' ? modelId : crypto.randomUUID();
    let existingAccounts = [];
    if (mode === 'edit') {
      const existing = allModelsDatabase.find(m => m.id === modelId);
      existingAccounts = existing?.accounts || [];
    }

    const modelData = {
      ...jsonStatus.parsed,
      name: modelName.trim(),
      id,
      accounts: existingAccounts,
    };

    const { id: _id, accounts: _acc, ...traits } = modelData;
    setModel({ ...traits, name: modelName.trim() });

    const updatedDB = saveModelData(modelData);
    setAllModelsDatabase(updatedDB);
    toast.success(`${modelName.trim()} ${mode === 'edit' ? 'mise a jour' : 'creee'}`);
    navigate('/');
  };

  const handleFormat = () => {
    if (jsonStatus.valid) {
      setJsonText(JSON.stringify(jsonStatus.parsed, null, 2));
      toast.success('JSON formate');
    }
  };

  // Photo handling
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (files.length === 0) return;

    const newPhotos = await Promise.all(files.map(async (file) => {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      return {
        file,
        preview: URL.createObjectURL(file),
        base64,
        mimeType: file.type || 'image/jpeg',
      };
    }));

    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
  };

  const removePhoto = (idx) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const handleExtractFromPhotos = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error("Configurez d'abord votre cle API (bouton API en haut a droite).");
      return;
    }
    if (photos.length === 0) {
      toast.error("Ajoutez au moins une photo.");
      return;
    }

    setIsExtracting(true);
    try {
      const result = await extractModelFromPhotos(
        apiKey,
        photos.map(p => ({ base64: p.base64, mimeType: p.mimeType }))
      );
      const jsonStr = JSON.stringify(result, null, 2);
      setJsonText(jsonStr);
      setInputMode('json'); // Switch to JSON view to review
      toast.success(`Profil extrait de ${photos.length} photo(s) — verifiez le JSON`);
    } catch (err) {
      toast.error(`Erreur d'extraction: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* TOP BAR */}
      <div className="shrink-0 h-12 px-6 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-zinc-200 text-[13px] transition-colors">
            &larr; Retour
          </button>
          <div className="h-4 w-px bg-zinc-800"></div>
          <span className="text-[14px] font-semibold text-zinc-200">
            {mode === 'edit' ? 'Editer' : 'Nouveau modele'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {inputMode === 'json' && (
            <button
              onClick={() => setShowTemplate(true)}
              className="h-8 px-3 rounded-lg text-[12px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              ✦ Template AI Studio
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!jsonStatus.valid || !modelName.trim()}
            className="h-8 px-4 rounded-lg text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Sauvegarder
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* MODEL NAME */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg shadow-amber-500/10">
                {modelName ? modelName.charAt(0).toUpperCase() : '?'}
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Nom du modele..."
                className="flex-1 bg-transparent text-zinc-100 text-xl font-semibold outline-none placeholder-zinc-700 border-b border-zinc-800 pb-2 focus:border-zinc-600 transition-colors"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && jsonStatus.valid && handleSave()}
              />
            </div>
          </div>

          {/* MODE TOGGLE */}
          <div className="flex gap-1 p-1 bg-zinc-900/80 rounded-lg border border-zinc-800/60 mb-4">
            <button
              onClick={() => setInputMode('json')}
              className={`flex-1 text-[12px] font-semibold py-2 rounded-md transition-all ${inputMode === 'json'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              📝 Coller le JSON
            </button>
            <button
              onClick={() => setInputMode('photo')}
              className={`flex-1 text-[12px] font-semibold py-2 rounded-md transition-all ${inputMode === 'photo'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              📷 Extraire depuis photo
            </button>
          </div>

          {/* JSON INPUT MODE */}
          {inputMode === 'json' && (
            <div className={`bg-zinc-900/60 border rounded-xl p-5 transition-colors ${jsonStatus.empty
              ? 'border-zinc-800/60'
              : jsonStatus.valid
                ? 'border-emerald-500/40'
                : 'border-red-500/40'
              }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">Profil JSON</h2>
                  <p className="text-[12px] text-zinc-600 mt-0.5">
                    Collez le JSON genere par AI Studio. Il sera injecte strictement dans les prompts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {jsonStatus.valid && (
                    <button
                      onClick={handleFormat}
                      className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors"
                    >
                      Formater
                    </button>
                  )}
                  {!jsonStatus.empty && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${jsonStatus.valid
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-red-400 bg-red-500/10'
                      }`}>
                      {jsonStatus.valid ? '✓ Valide' : '✗ Invalide'}
                    </span>
                  )}
                </div>
              </div>

              <textarea
                rows={22}
                className="w-full bg-zinc-950 border border-zinc-800/60 text-zinc-300 text-[12px] font-mono rounded-lg px-4 py-3 outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700 resize-none leading-relaxed custom-scrollbar"
                placeholder={`{\n  "age": "22",\n  "ethnicity": "Latina, delicate and defined features",\n  "face": { ... },\n  "eyes": { ... },\n  "hair": { ... },\n  "body": { ... },\n  "skin": { ... },\n  "anatomical_fidelity": "...",\n  "signature": "..."\n}`}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
              />

              {jsonStatus.error && !jsonStatus.empty && (
                <p className="text-[11px] text-red-400/80 mt-2 font-mono">
                  Erreur: {jsonStatus.error}
                </p>
              )}
            </div>
          )}

          {/* PHOTO INPUT MODE */}
          {inputMode === 'photo' && (
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-200">Extraction depuis photos</h2>
                <p className="text-[12px] text-zinc-600 mt-0.5">
                  Uploadez 1 a 5 photos de la modele. Gemini analysera les images et extraira automatiquement
                  le profil physique complet en JSON.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-zinc-700/60 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/20 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="text-3xl mb-3 opacity-30 group-hover:opacity-50 transition-opacity">📷</div>
                <p className="text-[13px] text-zinc-400 font-medium">Cliquez ou glissez des photos ici</p>
                <p className="text-[11px] text-zinc-600 mt-1">JPG, PNG — max 5 images</p>
              </div>

              {/* Photo previews */}
              {photos.length > 0 && (
                <div className="mt-4">
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative shrink-0 group/thumb">
                        <img
                          src={photo.preview}
                          alt={`Photo ${idx + 1}`}
                          className="w-20 h-20 rounded-lg object-cover border border-zinc-700/60"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/90 text-white text-[10px] flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">{photos.length}/5 photo(s)</p>
                </div>
              )}

              {/* Extract button */}
              <button
                onClick={handleExtractFromPhotos}
                disabled={photos.length === 0 || isExtracting}
                className="mt-5 w-full h-11 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:from-violet-400 hover:to-indigo-400 transition-all shadow-lg shadow-violet-500/10 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    ✨ Extraire le profil avec Gemini
                  </>
                )}
              </button>

              {/* Result indicator */}
              {jsonStatus.valid && inputMode === 'photo' && (
                <div className="mt-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-emerald-400 font-medium">✓ Profil extrait — basculez sur l'onglet JSON pour vérifier</span>
                    <button
                      onClick={() => setInputMode('json')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline"
                    >
                      Voir le JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HELP */}
          <div className="mt-4 px-1">
            <div className="flex items-start gap-3 text-[11px] text-zinc-600">
              <span className="text-amber-500/60 mt-0.5">i</span>
              <p>
                {inputMode === 'json' ? (
                  <>
                    Utilisez le bouton <strong className="text-zinc-400">"Template AI Studio"</strong> pour obtenir
                    le prompt a coller dans Google AI Studio avec une photo de la modele.
                    Ou passez en mode <strong className="text-zinc-400">"Extraire depuis photo"</strong> pour
                    laisser Gemini analyser automatiquement les photos.
                  </>
                ) : (
                  <>
                    Gemini Flash analysera les photos et generera un profil JSON complet.
                    Plus il y a de photos (visage, corps, profil), plus l'extraction sera precise.
                    Le resultat sera editable dans l'onglet JSON avant de sauvegarder.
                  </>
                )}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* TEMPLATE MODAL */}
      <ModelTemplateModal
        isOpen={showTemplate}
        onClose={() => setShowTemplate(false)}
      />
    </div>
  );
};

export default ModelEditorShell;
