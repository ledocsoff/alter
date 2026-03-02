import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { StudioProvider } from './store/StudioContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StudioProvider>
      <App />
    </StudioProvider>
  </React.StrictMode>,
)
