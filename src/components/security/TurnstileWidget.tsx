/**
 * Cloudflare Turnstile widget wrapper.
 * Renders only when VITE_TURNSTILE_SITE_KEY is set; otherwise a no-op (auto-passes).
 */
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  action?: string;
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({ onVerify, onExpire, action }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey) {
      // No captcha configured — auto-pass with a dev token.
      onVerify("dev-bypass");
      return;
    }

    let cancelled = false;

    const loadScript = () =>
      new Promise<void>((resolve) => {
        if (window.turnstile) return resolve();
        const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          return;
        }
        const s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        document.head.appendChild(s);
      });

    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
      });
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, action, onVerify, onExpire]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="my-3" />;
}
