import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { syncMetadata } from "./lib/sync-metadata";
import { logError } from "./lib/error-logger";

// Global error handlers for unhandled errors & promise rejections
window.addEventListener("error", (event) => {
  logError(event.error ?? event.message, {
    source: "window.onerror",
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logError(event.reason, { source: "unhandledrejection" });
});

function showBootFallback(message = "De app kon niet worden geladen. Herlaad de pagina om het opnieuw te proberen.") {
  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7fbf9;color:#0a2530;text-align:center;">
      <div style="max-width:28rem;">
        <h1 style="margin:0 0 .75rem;font-size:1.375rem;">Er ging iets mis bij het laden</h1>
        <p style="margin:0 0 1rem;color:#55706b;">${message}</p>
        <button type="button" onclick="window.location.reload()" style="border:1px solid #2f7f68;background:#2f7f68;color:white;border-radius:.5rem;padding:.625rem 1rem;cursor:pointer;">Pagina herladen</button>
      </div>
    </div>
  `;
}

const isPreviewEnvironment =
  import.meta.env.DEV ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isPreviewEnvironment) {
  // Never block rendering in preview/dev
  renderApp();
} else {
  // Production-only build version check
  const BUILD_VERSION = __BUILD_TIMESTAMP__;
  const storedVersion = localStorage.getItem("app_version");

  if (storedVersion && storedVersion !== BUILD_VERSION) {
    localStorage.setItem("app_version", BUILD_VERSION);

    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString());
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
  } else {
    if (!storedVersion) {
      localStorage.setItem("app_version", BUILD_VERSION);
    }

    if (window.location.search.includes("_v=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("_v");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }

    renderApp();
  }
}
function renderApp() {
  try {
    const root = document.getElementById("root");
    if (!root) {
      throw new Error("Root element #root ontbreekt");
    }

    syncMetadata();
    createRoot(root).render(<App />);
  } catch (error) {
    logError(error, { source: "app_boot" });
    showBootFallback();
  }
}
