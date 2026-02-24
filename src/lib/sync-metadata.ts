/**
 * Synchronises HTML document metadata (title, description, OG tags, theme-color)
 * with the centralised app-config so that index.html can use generic placeholders.
 *
 * Called once at app boot from main.tsx.
 */
import config from "./app-config";

function setMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  const selector = `meta[${attribute}="${name}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function syncMetadata() {
  // Title
  document.title = `${config.appName} - Leer Arabisch`;

  // Standard meta
  setMeta("description", `${config.appName} (${config.appNameShort}) - Leer Arabisch met passie en toewijding.`);
  setMeta("author", config.appName);
  setMeta("theme-color", config.themeColor);

  // Open Graph
  setMeta("og:title", config.appName, "property");
  setMeta("og:description", "Leer Arabisch met passie en toewijding - Learn Arabic with passion and dedication", "property");

  // Twitter
  if (config.social.twitter) {
    setMeta("twitter:site", config.social.twitter);
  }
}
