import React, { Suspense, lazy, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useLocation } from 'react-router-dom';
import { useDatabase } from './store/StudioContext';
import { useToast } from './store/ToastContext';
import { exportAllData, importAllData, getApiKey } from './utils/storage';
import ApiKeyModal from './features/ApiKeyModal/ApiKeyModal';
import ModelsView from './views/ModelsView';

const ModelEditorShell = lazy(() => import('./views/ModelEditorShell'));
const AccountsView = lazy(() => import('./views/AccountsView'));
const LocationsAndSandboxView = lazy(() => import('./views/LocationsAndSandboxView'));
const GenerationView = lazy(() => import('./views/GenerationView'));

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-5 h-5 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin"></div>
  </div>
);

const Breadcrumb = () => {
  const { modelId, accountId, locationId } = useParams();
  const location = useLocation();
  const { allModelsDatabase } = useDatabase();

  if (location.pathname === '/') return null;

  const currentModel = allModelsDatabase.find(m => m.id === modelId);
  const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);
  const currentLocation = locationId && locationId !== 'sandbox'
    ? currentAccount?.locations?.find(l => l.id === locationId)
    : null;

  const crumbs = [{ label: 'Modeles', path: '/' }];

  if (modelId && currentModel) {
    crumbs.push({ label: currentModel.name, path: `/models/${modelId}/accounts` });
  }
  if (accountId && currentAccount) {
    crumbs.push({ label: currentAccount.handle, path: `/models/${modelId}/accounts/${accountId}/locations` });
  }
  if (locationId) {
    crumbs.push({
      label: locationId === 'sandbox' ? 'Sandbox' : currentLocation?.name || '...',
      path: null,
    });
  }
  if (location.pathname.includes('/new')) {
    crumbs.push({ label: 'Nouveau', path: null });
  } else if (location.pathname.includes('/edit')) {
    crumbs.push({ label: 'Edition', path: null });
  }

  return (
    <div className="flex items-center gap-0.5 text-[13px]">
      {crumbs.map((crumb, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-zinc-700 mx-1 select-none">/</span>}
          {crumb.path ? (
            <Link
              to={crumb.path}
              className="text-zinc-500 hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded-md hover:bg-white/[0.04]"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-zinc-200 font-medium px-1.5 py-0.5">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const AppLayout = ({ children }) => {
  const toast = useToast();
  const { setAllModelsDatabase } = useDatabase();
  const fileInputRef = useRef(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [hasKey, setHasKey] = useState(() => !!getApiKey());

  const handleExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanabanana-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exporte');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const models = importAllData(ev.target.result);
        setAllModelsDatabase(models);
        toast.success(`${models.length} modele(s) importe(s)`);
      } catch {
        toast.error('Fichier invalide');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans antialiased">
      <header className="px-6 h-12 bg-[#09090b]/80 border-b border-zinc-800/50 flex items-center gap-6 sticky top-0 z-50 backdrop-blur-xl">
        <Link to="/" className="hover:opacity-80 transition-opacity shrink-0 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-[10px] font-black text-white leading-none">N</span>
          </div>
          <span className="text-[15px] font-bold text-zinc-100 tracking-tight hidden sm:block">
            NanaBanana
          </span>
        </Link>
        <div className="hidden md:block h-4 w-px bg-zinc-800"></div>
        <div className="hidden md:block flex-1">
          <Breadcrumb />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md transition-colors hover:bg-zinc-800/50"
            title="Configurer la cle API Google AI Studio"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
            <span className={hasKey ? 'text-zinc-400' : 'text-zinc-600 hover:text-zinc-300'}>API</span>
          </button>
          <div className="h-3 w-px bg-zinc-800/60"></div>
          <button
            onClick={handleExport}
            className="text-[11px] font-medium text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors"
            title="Exporter les donnees"
          >
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-medium text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors"
            title="Importer un backup"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col h-[calc(100vh-48px)] overflow-hidden">
        {children}
      </main>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={(saved) => {
          setShowApiKeyModal(false);
          if (saved) setHasKey(true);
        }}
      />
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<AppLayout><LoadingFallback /></AppLayout>}>
      <Routes>
        <Route path="/" element={<AppLayout><ModelsView /></AppLayout>} />
        <Route path="/models/new" element={<AppLayout><ModelEditorShell mode="create" /></AppLayout>} />
        <Route path="/models/:modelId/edit" element={<AppLayout><ModelEditorShell mode="edit" /></AppLayout>} />
        <Route path="/models/:modelId/accounts" element={<AppLayout><AccountsView /></AppLayout>} />
        <Route path="/models/:modelId/accounts/:accountId/locations" element={<AppLayout><LocationsAndSandboxView /></AppLayout>} />
        <Route path="/models/:modelId/accounts/:accountId/locations/:locationId/generate" element={<AppLayout><GenerationView /></AppLayout>} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
