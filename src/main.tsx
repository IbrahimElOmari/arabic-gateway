import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build version check - forces reload when new version is deployed
const BUILD_VERSION = '__BUILD_TIMESTAMP__';
const storedVersion = localStorage.getItem('app_version');

if (storedVersion !== BUILD_VERSION) {
  localStorage.setItem('app_version', BUILD_VERSION);

  // Unregister all Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister());
    });
  }

  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }

  // Force reload with fresh assets (only if not the very first visit)
  if (storedVersion !== null) {
    window.location.reload();
  }
} else {
  // Still clean up any lingering SWs
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister());
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
