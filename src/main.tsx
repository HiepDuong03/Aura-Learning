import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ProductionErrorBoundary } from './components/Common/ProductionErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProductionErrorBoundary componentName="AURA Learning">
      <App />
    </ProductionErrorBoundary>
  </React.StrictMode>
);

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Log SW registration in production
        if (import.meta.env.PROD) {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        }
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}
