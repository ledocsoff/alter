import React from 'react';
import { useStudio } from '../../store/StudioContext';
import { MODEL_OPTIONS } from '../../constants/modelOptions';

const DropdownSelect = ({ label, options, value, onChange }) => (
  <div className="flex flex-col mb-3">
    <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
    <select
      className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors"
      value={value}
      onChange={onChange}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const SectionTitle = ({ title }) => (
  <h3 className="text-lg font-bold text-gray-100 mt-6 mb-4 border-b border-gray-700 pb-2 uppercase tracking-wider">{title}</h3>
);

const ModelEditor = () => {
  const { model, updateModelCategory } = useStudio();

  return (
    <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6 h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Physique du Modèle (Face ID)</h2>
      <p className="text-gray-400 text-sm mb-6">Paramètre ici les traits invariants de ton influenceuse (Visage, Peau, Morphologie).</p>
      
      <SectionTitle title="Morphologie & Corps" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <DropdownSelect label="Type de corps (Body Type)" options={MODEL_OPTIONS.body.type} value={model.body.type} onChange={(e) => updateModelCategory('body', 'type', e.target.value)} />
        <DropdownSelect label="Poitrine (Bust)" options={MODEL_OPTIONS.body.bust} value={model.body.bust} onChange={(e) => updateModelCategory('body', 'bust', e.target.value)} />
        <DropdownSelect label="Taille (Waist)" options={MODEL_OPTIONS.body.waist} value={model.body.waist} onChange={(e) => updateModelCategory('body', 'waist', e.target.value)} />
        <DropdownSelect label="Hanches (Hips)" options={MODEL_OPTIONS.body.hips} value={model.body.hips} onChange={(e) => updateModelCategory('body', 'hips', e.target.value)} />
        <DropdownSelect label="Fessiers (Glutes)" options={MODEL_OPTIONS.body.glutes} value={model.body.glutes} onChange={(e) => updateModelCategory('body', 'glutes', e.target.value)} />
        <DropdownSelect label="Taille (Height)" options={MODEL_OPTIONS.body.height} value={model.body.height} onChange={(e) => updateModelCategory('body', 'height', e.target.value)} />
      </div>

      <SectionTitle title="Peau & Teint" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <DropdownSelect label="Carnation (Tone)" options={MODEL_OPTIONS.skin.tone} value={model.skin.tone} onChange={(e) => updateModelCategory('skin', 'tone', e.target.value)} />
        <DropdownSelect label="Texture (Texture)" options={MODEL_OPTIONS.skin.texture} value={model.skin.texture} onChange={(e) => updateModelCategory('skin', 'texture', e.target.value)} />
        <DropdownSelect label="Détails (Features)" options={MODEL_OPTIONS.skin.features} value={model.skin.features} onChange={(e) => updateModelCategory('skin', 'features', e.target.value)} />
        <DropdownSelect label="Rendu de Peau (Sheen)" options={MODEL_OPTIONS.skin.sheen} value={model.skin.sheen} onChange={(e) => updateModelCategory('skin', 'sheen', e.target.value)} />
      </div>

      <SectionTitle title="Visage & Cheveux" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
         <DropdownSelect label="Forme du Visage" options={MODEL_OPTIONS.face.shape} value={model.face.shape} onChange={(e) => updateModelCategory('face', 'shape', e.target.value)} />
         <DropdownSelect label="Mâchoire" options={MODEL_OPTIONS.face.jawline} value={model.face.jawline} onChange={(e) => updateModelCategory('face', 'jawline', e.target.value)} />
         
         <DropdownSelect label="Couleur des Yeux" options={MODEL_OPTIONS.eyes.color} value={model.eyes.color} onChange={(e) => updateModelCategory('eyes', 'color', e.target.value)} />
         <DropdownSelect label="Forme des Yeux" options={MODEL_OPTIONS.eyes.shape} value={model.eyes.shape} onChange={(e) => updateModelCategory('eyes', 'shape', e.target.value)} />
         
         <DropdownSelect label="Forme du Nez" options={MODEL_OPTIONS.nose.shape} value={model.nose.shape} onChange={(e) => updateModelCategory('nose', 'shape', e.target.value)} />
         <DropdownSelect label="Levres" options={MODEL_OPTIONS.lips.shape} value={model.lips.shape} onChange={(e) => updateModelCategory('lips', 'shape', e.target.value)} />

         <DropdownSelect label="Couleur Cheveux" options={MODEL_OPTIONS.hair.color} value={model.hair.color} onChange={(e) => updateModelCategory('hair', 'color', e.target.value)} />
         <DropdownSelect label="Style Cheveux" options={MODEL_OPTIONS.hair.style} value={model.hair.style} onChange={(e) => updateModelCategory('hair', 'style', e.target.value)} />
         <DropdownSelect label="Longueur Cheveux" options={MODEL_OPTIONS.hair.length} value={model.hair.length} onChange={(e) => updateModelCategory('hair', 'length', e.target.value)} />
         <DropdownSelect label="Texture Cheveux" options={MODEL_OPTIONS.hair.texture} value={model.hair.texture} onChange={(e) => updateModelCategory('hair', 'texture', e.target.value)} />
      </div>

    </div>
  );
};

export default ModelEditor;
