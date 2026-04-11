import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function showErrorInRoot(msg) {
  try {
    const root = document.getElementById('root')
    if (!root) return
    root.innerHTML = `<pre style="font-family: monospace; white-space: pre-wrap; color: #fff; background: #b00020; padding:12px; border-radius:8px;">${String(msg)}</pre>`
  } catch (e) {
    // ignore
  }
}

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (err) {
  showErrorInRoot(err && err.stack ? err.stack : String(err))
  throw err
}
