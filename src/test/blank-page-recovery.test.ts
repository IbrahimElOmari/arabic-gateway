import { describe, expect, it } from "vitest";
import { buildLazyRetryUrl, isLazyModuleLoadError } from "@/lib/lazy-retry";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("blank page recovery safeguards", () => {
  it("detects dynamic module load failures", () => {
    expect(isLazyModuleLoadError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isLazyModuleLoadError(new Error("ChunkLoadError: Loading chunk 12 failed"))).toBe(true);
    expect(isLazyModuleLoadError(new Error("Regular render error"))).toBe(false);
  });

  it("builds a cache-busting retry URL while preserving path and hash", () => {
    expect(buildLazyRetryUrl("https://example.com/dashboard?tab=a#top", 123)).toBe("/dashboard?tab=a&_lazy_retry=123#top");
  });

  it("keeps a visible boot fallback in index.html", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    expect(html).toContain("Huis van het Arabisch wordt geladen");
    expect(html).toContain("id=\"root\"");
  });

  it("does not configure vite-plugin-pwa or generate cache-first service worker assets", () => {
    const config = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(config).not.toContain("vite-plugin-pwa");
    expect(config).not.toContain("VitePWA");
    expect(config).not.toContain("CacheFirst");
    expect(config).not.toContain("navigateFallback");
    expect(packageJson).not.toContain("vite-plugin-pwa");
  });
});
