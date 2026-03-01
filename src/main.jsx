import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PromptStudio from './App'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <PromptStudio />
    </StrictMode>
)
