import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { applyAccentColor, DEFAULT_ACCENT } from './lib/accent-colors.ts'
import { loadAccentColor } from './lib/storage.ts'

applyAccentColor(loadAccentColor() ?? DEFAULT_ACCENT)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
