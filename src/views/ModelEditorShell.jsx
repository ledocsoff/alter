import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStudio } from '../store/StudioContext';
import { useToast } from '../store/ToastContext';
import { saveModelData, getSavedModels } from '../utils/storage';
import ModelEditor from '../features/ModelEditor/ModelEditor';
import { DEFAULT_MODEL } from '../constants/modelOptions';

const ETHNICITY_PRESETS = [
  "Latina, delicate and defined features",
  "Caucasian, European soft features",
  "East Asian, smooth delicate features",
  "Southeast Asian, warm toned features",
  "African, rich dark features",
  "Middle Eastern, defined striking features",
  "Mixed race, unique blended features",
  "Scandinavian, fair sharp features",
  "Mediterranean, olive toned features",
  "South Asian, warm golden features",
];

const inputClass = "w-full bg-zinc-950 border border-zinc-800/60 text-zinc-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700";
const labelClass = "text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block";

const ModelEditorShell = ({ mode }) => {
  const navigate = useNavigate();
  const { modelId } = useParams();
  const { model, setModel, updateModelField, allModelsDatabase, setAllModelsDatabase } = useStudio();
  const toast = useToast();

  const [modelName, setModelName] = useState('');
  const [customEthnicity, setCustomEthnicity] = useState('');

  useEffect(() => {
    if (mode === 'edit' && modelId) {
      const dbModels = getSavedModels();
      const existingModel = dbModels.find(m => m.id === modelId);
      if (existingModel) {
        setModelName(existingModel.name);
        const { id, accounts, ...modelFeatures } = existingModel;
        setModel({ ...modelFeatures, name: existingModel.name });
        if (!ETHNICITY_PRESETS.includes(existingModel.ethnicity)) {
          setCustomEthnicity(existingModel.ethnicity || '');
        }
      }
    } else {
      setModel(DEFAULT_MODEL);
      setModelName('');
      setCustomEthnicity('');
    }
  }, [mode, modelId, setModel]);

  const handleSave = () => {
    if (!modelName.trim()) {
      toast.error("Donnez un nom a cette influenceuse.");
      return;
    }

    const id = mode === 'edit' ? modelId : crypto.randomUUID();
    let existingAccounts = [];
    if (mode === 'edit') {
      const existing = allModelsDatabase.find(m => m.id === modelId);
      existingAccounts = existing?.accounts || [];
    }

    const updatedDB = saveModelData({ ...model, name: modelName.trim(), id, accounts: existingAccounts });
    setAllModelsDatabase(updatedDB);
    toast.success(`${modelName.trim()} ${mode === 'edit' ? 'mise a jour' : 'creee'}`);
    navigate('/');
  };

  const isCustomEthnicity = !ETHNICITY_PRESETS.includes(model.ethnicity);

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
        <button
          onClick={handleSave}
          className="h-8 px-4 rounded-lg text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
        >
          Sauvegarder
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* IDENTITY */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-4 mb-6">
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
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className={labelClass}>Age</label>
                <input
                  type="number" min="18" max="60"
                  className={inputClass}
                  value={model.age}
                  onChange={(e) => updateModelField('age', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Ethnicite</label>
                <select
                  className={inputClass}
                  value={isCustomEthnicity ? '__custom__' : model.ethnicity}
                  onChange={(e) => {
                    if (e.target.value !== '__custom__') {
                      updateModelField('ethnicity', e.target.value);
                      setCustomEthnicity('');
                    }
                  }}
                >
                  {ETHNICITY_PRESETS.map(eth => <option key={eth} value={eth}>{eth.split(',')[0]}</option>)}
                  <option value="__custom__">Personnalise...</option>
                </select>
                {isCustomEthnicity && (
                  <input
                    type="text"
                    className={inputClass + " mt-2"}
                    placeholder="Ethnicite en anglais..."
                    value={customEthnicity}
                    onChange={(e) => {
                      setCustomEthnicity(e.target.value);
                      if (e.target.value.trim()) updateModelField('ethnicity', e.target.value);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-zinc-800/40">
              <div>
                <label className={labelClass}>Directives anatomiques <span className="text-red-400/50 normal-case font-normal">important</span></label>
                <textarea
                  rows={3}
                  className={inputClass + " resize-none font-mono text-[12px] leading-relaxed"}
                  placeholder="Ex: Exact preservation of high-volume chest-to-waist ratio..."
                  value={model.anatomical_fidelity}
                  onChange={(e) => updateModelField('anatomical_fidelity', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Signature esthetique</label>
                <textarea
                  rows={3}
                  className={inputClass + " resize-none font-mono text-[12px] leading-relaxed"}
                  placeholder="Ex: candid smartphone aesthetic, raw authenticity..."
                  value={model.signature}
                  onChange={(e) => updateModelField('signature', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* PHYSICAL EDITOR */}
          <ModelEditor />

        </div>
      </div>
    </div>
  );
};

export default ModelEditorShell;
