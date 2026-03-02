import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { syncMetadata } from "./lib/sync-metadata";

if (import.meta.env.DEV) {
  // Skip version check in development to prevent reload loops
  renderApp();
} else {
  // Build version check - forces reload when new version is deployed
  const BUILD_VERSION = '__BUILD_TIMESTAMP__';
  const storedVersion = localStorage.getItem('app_version');

  if (storedVersion !== BUILD_VERSION) {
    localStorage.setItem('app_version', BUILD_VERSION);

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
      cleanup().finally(() => {
        window.location.href = window.location.pathname + '?_v=' + Date.now();
      });
    } else {
      cleanup().finally(() => {
        renderApp();
      });
    }
  } else {
    if (window.location.search.includes('_v=')) {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
    renderApp();
  }
}
function renderApp() {
  syncMetadata();
  createRoot(document.getElementById("root")!).render(<App />);
}
