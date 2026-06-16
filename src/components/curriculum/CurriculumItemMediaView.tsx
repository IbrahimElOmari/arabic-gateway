import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";
import { useTranslation } from "react-i18next";
import { Link2 } from "lucide-react";
import type { MediaRow } from "./CurriculumItemMediaPanel";

interface Props {
  itemId: string;
  alt?: string;
}

export function CurriculumItemMediaView({ itemId, alt }: Props) {
  const { t } = useTranslation();
  const { data: media = [] } = useQuery({
    queryKey: ["curriculum-item-media", itemId],
    queryFn: () =>
      apiQuery<MediaRow[]>("curriculum_item_media", (q) =>
        q.select("*").eq("item_id", itemId).order("sort_order", { ascending: true })
      ),
    enabled: !!itemId,
  });

  if (!media.length) return null;

  return (
    <div className="space-y-3">
      {media.map((m) => {
        if (m.kind === "image") {
          return (
            <img
              key={m.id}
              src={m.url}
              alt={m.alt || alt || ""}
              className="rounded-md max-w-full"
              loading="lazy"
            />
          );
        }
        if (m.kind === "audio") {
          return <audio key={m.id} controls src={m.url} className="w-full" aria-label={m.alt || undefined} />;
        }
        if (m.kind === "video") {
          return <video key={m.id} controls src={m.url} className="w-full rounded-md" aria-label={m.alt || undefined} />;
        }
        if (m.kind === "url") {
          return (
            <a
              key={m.id}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm underline text-primary"
            >
              <Link2 className="h-4 w-4" />
              {m.alt || m.url}
            </a>
          );
        }
        return (
          <a
            key={m.id}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 text-sm underline"
          >
            📎 {m.alt || t("curriculum.downloadFile", "Bestand downloaden")}
          </a>
        );
      })}
    </div>
  );
}
