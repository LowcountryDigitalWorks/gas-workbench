import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './design-system/tokens.css'
import './app/app.css'

const root = document.getElementById('root')

if (root === null) {
  throw new Error('G.A.S. Workbench root element was not found.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
