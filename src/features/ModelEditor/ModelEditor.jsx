import React from 'react';
import { useStudio } from '../../store/StudioContext';
import { MODEL_OPTIONS } from '../../constants/modelOptions';

const Select = ({ label, options, value, onChange }) => (
  <div>
    <label className="text-[11px] font-medium text-zinc-500 mb-1 block">{label}</label>
    <select
      className="w-full bg-zinc-950 border border-zinc-800/60 text-zinc-300 text-[13px] rounded-lg px-3 py-2 outline-none focus:border-zinc-600 transition-colors"
      value={value}
      onChange={onChange}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-800/40">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {children}
    </div>
  </div>
);

const ModelEditor = () => {
  const { model, updateModelCategory } = useStudio();

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-zinc-200 mb-1">Physique</h2>
      <p className="text-[12px] text-zinc-600 mb-6">Traits invariants du modele. Chaque champ impacte le prompt.</p>

      <Section title="Visage">
        <Select label="Forme" options={MODEL_OPTIONS.face.shape} value={model.face.shape} onChange={(e) => updateModelCategory('face', 'shape', e.target.value)} />
        <Select label="Machoire" options={MODEL_OPTIONS.face.jawline} value={model.face.jawline} onChange={(e) => updateModelCategory('face', 'jawline', e.target.value)} />
        <Select label="Front" options={MODEL_OPTIONS.face.forehead} value={model.face.forehead} onChange={(e) => updateModelCategory('face', 'forehead', e.target.value)} />
      </Section>

      <Section title="Yeux">
        <Select label="Couleur" options={MODEL_OPTIONS.eyes.color} value={model.eyes.color} onChange={(e) => updateModelCategory('eyes', 'color', e.target.value)} />
        <Select label="Forme" options={MODEL_OPTIONS.eyes.shape} value={model.eyes.shape} onChange={(e) => updateModelCategory('eyes', 'shape', e.target.value)} />
        <Select label="Taille" options={MODEL_OPTIONS.eyes.size} value={model.eyes.size} onChange={(e) => updateModelCategory('eyes', 'size', e.target.value)} />
        <Select label="Cils" options={MODEL_OPTIONS.eyes.lashes} value={model.eyes.lashes} onChange={(e) => updateModelCategory('eyes', 'lashes', e.target.value)} />
        <Select label="Sourcils" options={MODEL_OPTIONS.eyes.brows} value={model.eyes.brows} onChange={(e) => updateModelCategory('eyes', 'brows', e.target.value)} />
      </Section>

      <Section title="Nez & Levres">
        <Select label="Nez" options={MODEL_OPTIONS.nose.shape} value={model.nose.shape} onChange={(e) => updateModelCategory('nose', 'shape', e.target.value)} />
        <Select label="Levres" options={MODEL_OPTIONS.lips.shape} value={model.lips.shape} onChange={(e) => updateModelCategory('lips', 'shape', e.target.value)} />
        <Select label="Levre superieure" options={MODEL_OPTIONS.lips.upper} value={model.lips.upper} onChange={(e) => updateModelCategory('lips', 'upper', e.target.value)} />
        <Select label="Levre inferieure" options={MODEL_OPTIONS.lips.lower} value={model.lips.lower} onChange={(e) => updateModelCategory('lips', 'lower', e.target.value)} />
      </Section>

      <Section title="Cheveux">
        <Select label="Couleur" options={MODEL_OPTIONS.hair.color} value={model.hair.color} onChange={(e) => updateModelCategory('hair', 'color', e.target.value)} />
        <Select label="Longueur" options={MODEL_OPTIONS.hair.length} value={model.hair.length} onChange={(e) => updateModelCategory('hair', 'length', e.target.value)} />
        <Select label="Texture" options={MODEL_OPTIONS.hair.texture} value={model.hair.texture} onChange={(e) => updateModelCategory('hair', 'texture', e.target.value)} />
        <Select label="Style" options={MODEL_OPTIONS.hair.style} value={model.hair.style} onChange={(e) => updateModelCategory('hair', 'style', e.target.value)} />
      </Section>

      <Section title="Corps">
        <Select label="Type" options={MODEL_OPTIONS.body.type} value={model.body.type} onChange={(e) => updateModelCategory('body', 'type', e.target.value)} />
        <Select label="Stature" options={MODEL_OPTIONS.body.height} value={model.body.height} onChange={(e) => updateModelCategory('body', 'height', e.target.value)} />
        <Select label="Poitrine" options={MODEL_OPTIONS.body.bust} value={model.body.bust} onChange={(e) => updateModelCategory('body', 'bust', e.target.value)} />
        <Select label="Taille" options={MODEL_OPTIONS.body.waist} value={model.body.waist} onChange={(e) => updateModelCategory('body', 'waist', e.target.value)} />
        <Select label="Hanches" options={MODEL_OPTIONS.body.hips} value={model.body.hips} onChange={(e) => updateModelCategory('body', 'hips', e.target.value)} />
        <Select label="Fessiers" options={MODEL_OPTIONS.body.glutes} value={model.body.glutes} onChange={(e) => updateModelCategory('body', 'glutes', e.target.value)} />
        <Select label="Membres" options={MODEL_OPTIONS.body.limbs} value={model.body.limbs} onChange={(e) => updateModelCategory('body', 'limbs', e.target.value)} />
        <Select label="Details" options={MODEL_OPTIONS.body.details} value={model.body.details} onChange={(e) => updateModelCategory('body', 'details', e.target.value)} />
      </Section>

      <Section title="Peau">
        <Select label="Carnation" options={MODEL_OPTIONS.skin.tone} value={model.skin.tone} onChange={(e) => updateModelCategory('skin', 'tone', e.target.value)} />
        <Select label="Texture" options={MODEL_OPTIONS.skin.texture} value={model.skin.texture} onChange={(e) => updateModelCategory('skin', 'texture', e.target.value)} />
        <Select label="Traits" options={MODEL_OPTIONS.skin.features} value={model.skin.features} onChange={(e) => updateModelCategory('skin', 'features', e.target.value)} />
        <Select label="Rendu" options={MODEL_OPTIONS.skin.sheen} value={model.skin.sheen} onChange={(e) => updateModelCategory('skin', 'sheen', e.target.value)} />
        <Select label="Details" options={MODEL_OPTIONS.skin.details} value={model.skin.details} onChange={(e) => updateModelCategory('skin', 'details', e.target.value)} />
      </Section>
    </div>
  );
};

export default ModelEditor;
