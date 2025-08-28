import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store.ts'
import App from './App.tsx'
import './index.css'

// Register service worker for caching and offline support
// Temporarily disabled to test CORS issues
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        
      })
      .catch((registrationError) => {
        
      });
  });
}
*/

// Create root with RTL support
const root = document.getElementById('root')
root?.setAttribute('dir', 'rtl')

createRoot(root!).render(
  <Provider store={store}>
    <App />
  </Provider>
)
