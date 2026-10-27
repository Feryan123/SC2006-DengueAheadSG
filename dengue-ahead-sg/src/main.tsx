import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App.tsx'
import { createTemporaryLocationControl } from './TemporaryStartup.ts'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App locationControl={createTemporaryLocationControl()} />
  </StrictMode>,
)