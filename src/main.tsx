import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { seedInitialDataIfNeeded, resetDatabaseToFresh } from './db/dexie';
import './index.css';

// Expose reset helper on window for developer/tester convenience
if (typeof window !== 'undefined') {
  (window as any).resetAimData = async () => {
    await resetDatabaseToFresh();
    console.log('[AIM Fitness] Database wiped cleanly. Page reloading...');
    window.location.reload();
  };
}

// Seed IndexedDB if newly initialized on device
seedInitialDataIfNeeded()
  .then(() => {
    console.log('[AIM Fitness] Offline Dexie IndexedDB initialized and verified.');
  })
  .catch((err) => {
    console.error('[AIM Fitness] Dexie seed check failed:', err);
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
