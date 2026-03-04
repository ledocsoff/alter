import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { StudioProvider } from './store/StudioContext.jsx'
import { ToastProvider } from './store/ToastContext.jsx'
import { loadFromServer } from './utils/storage.js'

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
  console.error('[Velvet] Fatal:', err);
  document.getElementById('root').innerHTML = '<div style="color:#ef4444;padding:50px;font-family:system-ui"><h1>Erreur de démarrage</h1><p>' + err.message + '</p></div>';
})
