import { supabase } from "@/integrations/supabase/client";
import { apiQuery, apiMutate } from "@/lib/supabase-api";

const BUCKET = "curriculum-media";

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] ?? "");
  } catch {
    return url.slice(idx + marker.length);
  }
}

/** Delete a curriculum item and its attached storage files. Media rows cascade. */
export async function deleteCurriculumItem(id: string): Promise<void> {
  const media = await apiQuery<{ url: string; kind: string }[]>(
    "curriculum_item_media",
    (q) => q.select("url, kind").eq("item_id", id)
  );
  const paths = (media ?? [])
    .filter((m) => m.kind !== "url")
    .map((m) => storagePathFromPublicUrl(m.url))
    .filter((p): p is string => !!p);
  if (paths.length) {
    // Best-effort: ignore storage errors so the DB delete still proceeds.
    await supabase.storage.from(BUCKET).remove(paths).catch(() => undefined);
  }
  await apiMutate("curriculum_items", (q) => q.delete().eq("id", id));
}

/** Persist a new ordering by rewriting display_order on each row (0..n-1). */
export async function reorderCurriculumItems(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      apiMutate("curriculum_items", (q) => q.update({ display_order: i }).eq("id", id))
    )
  );
}
