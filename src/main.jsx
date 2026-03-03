import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { StudioProvider } from './store/StudioContext.jsx'
import { ToastProvider } from './store/ToastContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <StudioProvider>
        <App />
      </StudioProvider>
    </ToastProvider>
  </React.StrictMode>,
)
