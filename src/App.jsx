import React, { useState, useRef, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useLocation } from 'react-router-dom';
import { useStudio } from './store/StudioContext';
import { useToast } from './store/ToastContext';
import { exportAllData, importAllData, getApiKey, getApiKey2 } from './utils/storage';
import logger from './utils/logger';
import ApiKeyModal from './features/ApiKeyModal/ApiKeyModal';
import DebugPanel from './features/DebugPanel/DebugPanel';
import ErrorBoundary from './features/ErrorBoundary/ErrorBoundary';
import ShortcutsModal from './features/ShortcutsModal/ShortcutsModal';
import OnboardingFlow from './features/OnboardingFlow/OnboardingFlow';

// Code-splitting asynchrone des Vues (Améliore radicalement le Launch Time)
const ModelsView = React.lazy(() => import('./views/ModelsView'));
const ModelEditorShell = React.lazy(() => import('./views/ModelEditorShell'));
const AccountsView = React.lazy(() => import('./views/AccountsView'));
const LocationsView = React.lazy(() => import('./views/LocationsAndSandboxView'));
const GenerationView = React.lazy(() => import('./views/GenerationView'));

// Loader minimaliste pendant les micro-chargements asynchrones
const RouteLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-zinc-800 border-t-teal-500 rounded-full animate-spin" />
      <span className="text-xs text-zinc-500 font-medium">Chargement du module...</span>
    </div>
  </div>
);

const Breadcrumb = () => {
  const { modelId, accountId, locationId } = useParams();
  const location = useLocation();
  const { allModelsDatabase } = useStudio();

  if (location.pathname === '/') return null;

  const currentModel = allModelsDatabase.find(m => m.id === modelId);
  const currentAccount = currentModel?.accounts?.find(a => a.id === accountId);
  const currentLocation = locationId
    ? currentAccount?.locations?.find(l => l.id === locationId)
    : null;

  const crumbs = [{ label: 'Modèles', path: '/' }];

  if (modelId && currentModel) {
    crumbs.push({ label: currentModel.name, path: `/models/${modelId}/accounts` });
  }
  if (accountId && currentAccount) {
    crumbs.push({ label: currentAccount.handle, path: `/models/${modelId}/accounts/${accountId}/locations` });
  }
  if (locationId) {
    crumbs.push({
      label: currentLocation?.name || '...',
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
  const { setAllModelsDatabase } = useStudio();
  const fileInputRef = useRef(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasKey, setHasKey] = useState(() => !!getApiKey());
  const [hasKey2, setHasKey2] = useState(() => !!getApiKey2());
  const [errorCount, setErrorCount] = useState(0);
  const [serverOnline, setServerOnline] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Listen for native update events from electron-updater
  useEffect(() => {
    if (window.velvet) {
      if (window.velvet.onUpdateDownloaded) {
        window.velvet.onUpdateDownloaded((version) => {
          setHasUpdate(true);
          setIsCheckingUpdate(false);
          toast.success(`Mise à jour v${version} téléchargée et prête !`);
        });
      }
      if (window.velvet.onUpdateNotAvailable) {
        window.velvet.onUpdateNotAvailable(() => {
          setIsCheckingUpdate(false);
          toast.success('Velvet Studio est à jour ✨');
        });
      }
    }
  }, []);

  const handleCheckUpdate = async () => {
    if (!window.velvet?.checkForUpdates) return;
    setIsCheckingUpdate(true);
    toast.success('Recherche de mises à jour...', { duration: 2000 });
    try {
      const res = await window.velvet.checkForUpdates();
      if (!res?.success) {
        // En cas d'échec (ex: 404 car pas de release sur GitHub), on rassure l'utilisateur
        toast.success('Velvet Studio est à jour ✨');
        setIsCheckingUpdate(false);
      } else if (res.isUpdateAvailable) {
        toast.success('Version trouvée ! Téléchargement en cours...');
        setIsCheckingUpdate(false); // background download takes over
      }
    } catch (err) {
      setIsCheckingUpdate(false);
    }
  };

  const handleUpdate = () => {
    if (!window.velvet?.restartApp) return;
    setIsUpdating(true);
    window.velvet.restartApp();
  };

  // Health check — ping server every 30s, with startup retry
  const apiBase = (typeof window !== 'undefined' && window.location.protocol === 'file:') ? 'http://localhost:3001' : '';
  useEffect(() => {
    let cancelled = false;
    let interval;
    let failCount = 0;
    const ping = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch(`${apiBase}/api/health`, { signal: ctrl.signal });
        clearTimeout(timer);
        return r.ok;
      } catch { return false; }
    };

    // Startup: retry every 2s for up to 15s (server may be booting in Electron)
    const startup = async () => {
      for (let i = 0; i < 8; i++) {
        if (cancelled) return;
        const ok = await ping();
        if (ok) { setServerOnline(true); failCount = 0; break; }
        if (i === 7) { setServerOnline(false); break; }
        await new Promise(r => setTimeout(r, 2000));
      }
      // Then check every 30s — require 3 consecutive fails before going offline
      interval = setInterval(async () => {
        const ok = await ping();
        if (!cancelled) {
          if (ok) { failCount = 0; setServerOnline(true); }
          else { failCount++; if (failCount >= 3) setServerOnline(false); }
        }
      }, 30000);
    };
    startup();
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Make hasKey / hasKey2 reactive to storage changes
  useEffect(() => {
    const handleKeyChange = () => {
      setHasKey(!!getApiKey());
      setHasKey2(!!getApiKey2());
    };
    window.addEventListener('velvet:apikey-changed', handleKeyChange);
    return () => window.removeEventListener('velvet:apikey-changed', handleKeyChange);
  }, []);

  // Flash "Sauvegardé ✓" on successful sync
  useEffect(() => {
    const onSynced = () => {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    };
    window.addEventListener('velvet:synced', onSynced);
    return () => window.removeEventListener('velvet:synced', onSynced);
  }, []);

  // Global ? shortcut to show shortcuts modal
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const update = () => setErrorCount(logger.getLogs().filter(l => l.level === 'error').length);
    return logger.subscribe(update);
  }, []);

  const handleExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanabanana-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exporté');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const models = importAllData(ev.target.result);
        setAllModelsDatabase(models);
        toast.success(`${models.length} modèle(s) importé(s)`);
      } catch (err) {
        toast.error(err.message || 'Fichier invalide');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!hasKey) {
    return <OnboardingFlow onComplete={() => setHasKey(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans antialiased">
      <header className="px-6 h-12 bg-[#09090b]/80 border-b border-zinc-800/50 flex items-center gap-6 sticky top-0 z-50 backdrop-blur-xl">
        <Link to="/" className="hover:opacity-80 transition-opacity shrink-0 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <span className="text-[10px] font-black text-white leading-none">V</span>
          </div>
          <span className="text-[15px] font-bold text-zinc-100 tracking-tight hidden sm:block">
            Velvet
          </span>
        </Link>
        <button
          onClick={handleCheckUpdate}
          disabled={isCheckingUpdate || hasUpdate}
          className="group flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors font-mono -ml-4 hidden sm:flex px-2 py-1 rounded-md hover:bg-zinc-800/50"
          title="Rechercher des mises à jour"
        >
          <span>v{__APP_VERSION__}</span>
          {isCheckingUpdate ? (
            <div className="w-2.5 h-2.5 border border-zinc-500 border-t-zinc-300 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          )}
        </button>
        <div className="hidden md:block h-4 w-px bg-zinc-800"></div>
        <div className="hidden md:block flex-1">
          <Breadcrumb />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-300 ${savedFlash ? 'bg-emerald-500/10' : ''}`}
            title={serverOnline ? 'Serveur de sauvegarde connecté' : 'Serveur déconnecté — les données ne sont PAS sauvegardées sur le disque'}
          >
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${!serverOnline ? 'bg-red-500 animate-pulse' : savedFlash ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
            <span className={`text-[10px] font-medium transition-colors ${!serverOnline ? 'text-red-400' : savedFlash ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {!serverOnline ? 'Hors ligne' : savedFlash ? 'OK' : 'Sync'}
            </span>
          </div>
          <div className="h-3 w-px bg-zinc-800/60"></div>
          {hasUpdate && (
            <>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex items-center gap-1.5 text-[11px] font-bold text-teal-400 bg-teal-500/10 px-2 py-1 rounded-md hover:bg-teal-500/20 transition-colors animate-pulse disabled:opacity-50 disabled:animate-none"
                title="Installer la nouvelle version (Git pull + build)"
              >
                {isUpdating ? (
                  <div className="w-3 h-3 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin shrink-0"></div>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                )}
                <span>{isUpdating ? "MàJ en cours..." : "Mettre à jour"}</span>
              </button>
              <div className="h-3 w-px bg-zinc-800/60"></div>
            </>
          )}
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md transition-colors hover:bg-zinc-800/50"
            title={`Clé principale: ${hasKey ? 'active' : 'manquante'} · Clé de secours: ${hasKey2 ? 'active' : 'non configurée'}`}
          >
            {/* Primary key dot */}
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${hasKey ? 'bg-emerald-500 api-dot-active' : 'bg-zinc-700'}`} />
            {/* Secondary key dot — smaller, offset */}
            <div className={`w-1 h-1 rounded-full -ml-0.5 transition-colors ${hasKey2 ? 'bg-teal-400 api-dot-active' : 'bg-zinc-800'}`} />
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
          <div className="h-3 w-px bg-zinc-800/60"></div>
          <button
            onClick={() => setShowDebugPanel(true)}
            className="relative flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors"
            title="Logs de debug"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {errorCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">{errorCount > 9 ? '!' : errorCount}</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            aria-label="Importer sauvegarde JSON"
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
      <DebugPanel
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <HashRouter>
      <Suspense fallback={<AppLayout><RouteLoader /></AppLayout>}>
        <Routes>
          <Route path="/" element={<AppLayout><ModelsView /></AppLayout>} />
          <Route path="/models/new" element={<AppLayout><ErrorBoundary><ModelEditorShell mode="create" /></ErrorBoundary></AppLayout>} />
          <Route path="/models/:modelId/edit" element={<AppLayout><ErrorBoundary><ModelEditorShell mode="edit" /></ErrorBoundary></AppLayout>} />
          <Route path="/models/:modelId/accounts" element={<AppLayout><ErrorBoundary><AccountsView /></ErrorBoundary></AppLayout>} />
          <Route path="/models/:modelId/accounts/:accountId/locations" element={<AppLayout><ErrorBoundary><LocationsView /></ErrorBoundary></AppLayout>} />
          <Route path="/models/:modelId/accounts/:accountId/locations/:locationId/generate" element={<AppLayout><ErrorBoundary><GenerationView /></ErrorBoundary></AppLayout>} />
          <Route path="*" element={<AppLayout><ModelsView /></AppLayout>} />
        </Routes>
      </Suspense>
    </HashRouter>
  </ErrorBoundary >
);

export default App;
