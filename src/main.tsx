import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Unregister all existing Service Workers to prevent stale cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
