import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ModelsView from './views/ModelsView';
import ModelEditorShell from './views/ModelEditorShell';
import AccountsView from './views/AccountsView';
import LocationsAndSandboxView from './views/LocationsAndSandboxView';
import GenerationView from './views/GenerationView';

// -- THE GLOBAL LAYOUT SHELL --
const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      
      {/* HEADER BANNER GLOBAL */}
      <header className="px-6 py-4 bg-[#050505] border-b border-gray-800 flex items-center justify-between shadow-xl sticky top-0 z-50">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent inline-block">
            NanaBanana Studio
          </h1>
          <p className="text-gray-500 font-bold tracking-[0.2em] text-[10px] mt-0.5 uppercase">
            OFM Hub Architecture (Entonnoir v4.1)
          </p>
        </Link>
        <div className="flex gap-3">
            <Link to="/" className="text-sm font-bold text-blue-400 hover:text-white hover:bg-blue-900/40 bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-900/50 transition-colors flex items-center gap-2 shadow-sm">
               🏠 Modèles <span className="opacity-50">| Niveau 1</span>
            </Link>
        </div>
      </header>

      {/* DYNAMIC CONTENT AREA */}
      <main className="flex-1 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        {children}
      </main>

    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
           {/* LEVEL 1: Agence (Root) - List all models */}
          <Route path="/" element={<ModelsView />} />
          
          {/* LEVEL 1b: Edit or Create a Model */}
          <Route path="/models/new" element={<ModelEditorShell mode="create" />} />
          <Route path="/models/:modelId/edit" element={<ModelEditorShell mode="edit" />} />

          {/* LEVEL 2: Model selected -> List their Accounts */}
          <Route path="/models/:modelId/accounts" element={<AccountsView />} />
          
          {/* LEVEL 3: Account selected -> List Locations OR Sandbox */}
          <Route path="/models/:modelId/accounts/:accountId/locations" element={<LocationsAndSandboxView />} />
          
          {/* LEVEL 4: Scene Setup (Generation) for a specific Location OR Sandbox */}
          <Route path="/models/:modelId/accounts/:accountId/locations/:locationId/generate" element={<GenerationView />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;
