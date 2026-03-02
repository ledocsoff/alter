import React, { useState } from 'react';
import ModelEditor from './features/ModelEditor/ModelEditor';
import SceneEditor from './features/SceneEditor/SceneEditor';
import OutputPanel from './features/OutputPanel/OutputPanel';
import ModelManager from './features/ModelManager/ModelManager';

const App = () => {
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 md:p-6 lg:p-8 font-sans">
      
      {/* HEADER BANNER */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent inline-block">
            NanaBanana Studio
          </h1>
          <p className="text-gray-400 font-medium tracking-wide text-sm mt-1 uppercase">
            Prompt Generator for Virtual Influencers (OFM)
          </p>
        </div>
        
        {/* BOUTON MANAGER */}
        <button 
          onClick={() => setIsManagerOpen(true)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-semibold border border-gray-700 hover:border-blue-500 transition-colors shadow-sm"
          title="Ouvrir la base de données d'influenceuses"
        >
          <span className="text-blue-400">👤</span> Mes Modèles
        </button>
      </header>

      {/* MAIN GRID LAYOUT */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        
        {/* LEFT COLUMN: Face & Body Settings */}
        <section className="col-span-1 lg:col-span-4 h-full">
          <ModelEditor />
        </section>

        {/* MIDDLE COLUMN: Scene & Outfit Settings */}
        <section className="col-span-1 lg:col-span-4 h-full">
          <SceneEditor />
        </section>

        {/* RIGHT COLUMN: Output (Nano Banana Pro prompt) */}
        <section className="col-span-1 lg:col-span-4 h-full">
          <OutputPanel />
        </section>

      </main>

      {/* MODALE GESTIONNAIRE DE MODELES */}
      <ModelManager 
        isOpen={isManagerOpen} 
        onClose={() => setIsManagerOpen(false)} 
      />

    </div>
  );
};

export default App;
