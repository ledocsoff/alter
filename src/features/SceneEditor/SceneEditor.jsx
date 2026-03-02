import React from 'react';
import { useStudio } from '../../store/StudioContext';
import { SCENE_OPTIONS, OUTFIT_PRESETS } from '../../constants/sceneOptions';

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

const PresetGrid = ({ items, selected, onSelect }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {items.map((item) => (
      <button
        key={item.id}
        onClick={() => onSelect(item)}
        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
          selected?.id === item.id
            ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750 hover:border-gray-500'
        }`}
      >
        <span className="text-2xl mb-1">{item.icon}</span>
        <span className="text-xs font-medium text-center">{item.label}</span>
      </button>
    ))}
  </div>
);

const SceneEditor = () => {
  const { scene, updateSceneEntry } = useStudio();

  return (
    <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6 h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Paramètres de la Scène</h2>
      <p className="text-gray-400 text-sm mb-6">Met en scène ton modèle : habille-la et choisis son environnement.</p>

      <SectionTitle title="Vêtements & Outfits" />
      <PresetGrid
        items={OUTFIT_PRESETS}
        selected={scene.outfit}
        onSelect={(preset) => updateSceneEntry('outfit', preset)}
      />

      <SectionTitle title="Lieu & Ambiance" />
      <div className="grid grid-cols-1 gap-x-4 mt-2">
        <DropdownSelect label="Environnement (Lieu)" options={SCENE_OPTIONS.environment} value={scene.environment} onChange={(e) => updateSceneEntry('environment', e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <DropdownSelect label="Style de Photo (Vibe)" options={SCENE_OPTIONS.vibe} value={scene.vibe} onChange={(e) => updateSceneEntry('vibe', e.target.value)} />
            <DropdownSelect label="Éclairage (Lighting)" options={SCENE_OPTIONS.lighting} value={scene.lighting} onChange={(e) => updateSceneEntry('lighting', e.target.value)} />
        </div>
      </div>

      <SectionTitle title="Photographie & Posture" />
      <div className="grid grid-cols-1 gap-x-4 mt-2">
         <DropdownSelect label="Pose du Modèle" options={SCENE_OPTIONS.pose} value={scene.pose} onChange={(e) => updateSceneEntry('pose', e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <DropdownSelect label="Angle de Caméra" options={SCENE_OPTIONS.camera_angle} value={scene.camera_angle} onChange={(e) => updateSceneEntry('camera_angle', e.target.value)} />
            <DropdownSelect label="Expression" options={SCENE_OPTIONS.expression} value={scene.expression} onChange={(e) => updateSceneEntry('expression', e.target.value)} />
        </div>
      </div>

    </div>
  );
};

export default SceneEditor;
