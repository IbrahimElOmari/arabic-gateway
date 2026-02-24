/**
 * Generates public/manifest.json from src/lib/app-config.ts
 * Run with: npx tsx scripts/generate-manifest.ts
 *
 * Also usable as a Vite plugin (see vite-manifest-plugin.ts).
 */
import config from "../src/lib/app-config";
import { writeFileSync } from "fs";
import { resolve } from "path";

const manifest = {
  name: config.appName,
  short_name: config.appNameShort,
  description: `Learn Arabic with ${config.appName} - A blended learning platform`,
  start_url: "/",
  display: "standalone" as const,
  background_color: "#ffffff",
  theme_color: config.themeColor,
  orientation: "portrait-primary" as const,
  icons: [
    { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/pwa-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  categories: ["education", "productivity"],
  lang: "nl",
  dir: "auto",
  prefer_related_applications: false,
  related_applications: [
    { platform: "play", id: "app.lovable.5b95bcb7d1cf4a9b8b6f5039d3774e2e" },
  ],
  screenshots: [],
  shortcuts: [
    { name: "Zelfstudie", short_name: "Studie", description: "Start met zelfstudie oefeningen", url: "/self-study", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
    { name: "Live Lessen", short_name: "Lessen", description: "Bekijk je live lessen", url: "/live-lessons", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
    { name: "Dashboard", short_name: "Dashboard", description: "Ga naar je dashboard", url: "/dashboard", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
  ],
  share_target: {
    action: "/share",
    method: "POST",
    enctype: "multipart/form-data",
    params: { title: "title", text: "text", url: "url" },
  },
};

const outPath = resolve(__dirname, "../public/manifest.json");
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`✅ manifest.json generated from app-config.ts → ${outPath}`);
