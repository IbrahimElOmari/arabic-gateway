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
  syncMetadata();
  createRoot(document.getElementById("root")!).render(<App />);
}
