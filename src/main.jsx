import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { StudioProvider } from './store/StudioContext.jsx'
import { ToastProvider } from './store/ToastContext.jsx'
import { loadFromServer } from './utils/storage.js'

// Global error handlers — catch unhandled errors before React boots
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Alter] Unhandled rejection:', e.reason);
});
window.onerror = (msg, src, line, col, err) => {
  console.error('[Alter] Uncaught error:', msg, { src, line, col, err });
};

// Load data from server (sauvegarde/) into localStorage BEFORE React boots
loadFromServer().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ToastProvider>
        <StudioProvider>
          <App />
        </StudioProvider>
      </ToastProvider>
    </React.StrictMode>,
  )
}).catch(err => {
  console.error('[Alter] Fatal:', err);
  const root = document.getElementById('root');
  root.textContent = '';
  const container = document.createElement('div');
  container.style.cssText = 'color:#ef4444;padding:50px;font-family:system-ui';
  const h1 = document.createElement('h1');
  h1.textContent = 'Erreur de démarrage';
  const p = document.createElement('p');
  p.textContent = err.message;
  container.append(h1, p);
  root.appendChild(container);
})
