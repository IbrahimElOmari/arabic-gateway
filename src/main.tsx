import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build version check - forces reload when new version is deployed
const BUILD_VERSION = '__BUILD_TIMESTAMP__';
const storedVersion = localStorage.getItem('app_version');

if (storedVersion !== BUILD_VERSION) {
  localStorage.setItem('app_version', BUILD_VERSION);

  // Await full cleanup before reload
  const cleanup = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
    } catch (e) { /* ignore */ }
  };

  if (storedVersion !== null) {
    // Existing user with outdated version: cleanup then cache-busting reload
    cleanup().finally(() => {
      window.location.href = window.location.pathname + '?_v=' + Date.now();
    });
  } else {
    // First visit: just render
    cleanup().finally(() => {
      renderApp();
    });
  }
} else {
  // Remove cache-buster param if present
  if (window.location.search.includes('_v=')) {
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
  renderApp();
}

function renderApp() {
  createRoot(document.getElementById("root")!).render(<App />);
}
