/**
 * Realtime hook for DB-backed feature flags.
 * Reads from public.feature_flags; subscribes to realtime updates.
 *
 * Static FLAGS in src/lib/feature-flags.ts blijven werken voor compile-tijd flags.
 * DB-flags zijn voor gefaseerde uitrol zonder deploy.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apiQuery } from "@/lib/supabase-api";

export interface DbFeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  enabled_for_roles: string[];
}

let cache: Record<string, DbFeatureFlag> | null = null;
const listeners = new Set<() => void>();

async function loadAll(): Promise<Record<string, DbFeatureFlag>> {
  const rows = await apiQuery<DbFeatureFlag[]>("feature_flags", (q) => q.select("*"));
  const map: Record<string, DbFeatureFlag> = {};
  for (const r of rows ?? []) map[r.key] = r;
  cache = map;
  listeners.forEach((l) => l());
  return map;
}

let subscribed = false;
function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  void loadAll();
  supabase
    .channel("feature_flags_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "feature_flags" },
      () => {
        void loadAll();
      }
    )
    .subscribe();
}

function hashUser(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

export function useDbFeatureFlag(
  key: string,
  ctx?: { userId?: string; role?: string }
): boolean {
  const [, force] = useState(0);
  useEffect(() => {
    ensureSubscribed();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const flag = cache?.[key];
  if (!flag) return false;
  if (flag.enabled) return true;
  if (ctx?.role && flag.enabled_for_roles.includes(ctx.role)) return true;
  if (ctx?.userId && flag.rollout_percentage > 0) {
    return hashUser(ctx.userId) < flag.rollout_percentage;
  }
  return false;
}
