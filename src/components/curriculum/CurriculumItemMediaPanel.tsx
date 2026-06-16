import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, ArrowUp, ArrowDown, Upload, Link2, Image as ImageIcon, FileAudio, Film, File as FileIcon } from "lucide-react";

const BUCKET = "curriculum-media";

export type MediaKind = "image" | "audio" | "video" | "file" | "url";

export interface MediaRow {
  id: string;
  item_id: string;
  kind: MediaKind;
  url: string;
  alt: string | null;
  sort_order: number;
}

interface Props {
  itemId: string;
}

function kindFromMime(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

function KindIcon({ kind }: { kind: MediaKind }) {
  const cls = "h-4 w-4";
  if (kind === "image") return <ImageIcon className={cls} />;
  if (kind === "audio") return <FileAudio className={cls} />;
  if (kind === "video") return <Film className={cls} />;
  if (kind === "url") return <Link2 className={cls} />;
  return <FileIcon className={cls} />;
}

export function CurriculumItemMediaPanel({ itemId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlAlt, setUrlAlt] = useState("");

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["curriculum-item-media", itemId],
    queryFn: () =>
      apiQuery<MediaRow[]>("curriculum_item_media", (q) =>
        q.select("*").eq("item_id", itemId).order("sort_order", { ascending: true })
      ),
    enabled: !!itemId,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["curriculum-item-media", itemId] });
  }

  const nextSort = (media[media.length - 1]?.sort_order ?? -1) + 1;

  const insertRow = useMutation({
    mutationFn: (row: { kind: MediaKind; url: string; alt: string; sort_order: number }) =>
      apiMutate("curriculum_item_media", (q) =>
        q.insert({
          item_id: itemId,
          kind: row.kind,
          url: row.url,
          alt: row.alt,
          sort_order: row.sort_order,
          created_by: user?.id,
        })
      ),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message }),
  });

  const delRow = useMutation({
    mutationFn: (id: string) =>
      apiMutate("curriculum_item_media", (q) => q.delete().eq("id", id)),
    onSuccess: () => invalidate(),
  });

  const updateSort = useMutation({
    mutationFn: (rows: { id: string; sort_order: number }[]) =>
      Promise.all(
        rows.map((r) =>
          apiMutate("curriculum_item_media", (q) =>
            q.update({ sort_order: r.sort_order }).eq("id", r.id)
          )
        )
      ),
    onSuccess: () => invalidate(),
  });

  async function handleUpload(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${itemId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      await insertRow.mutateAsync({
        kind: kindFromMime(file.type),
        url: pub.publicUrl,
        alt: file.name,
        sort_order: nextSort,
      });
      toast({ title: t("curriculum.mediaUploaded", "Media toegevoegd") });
    } catch (e: any) {
      toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addUrl() {
    const v = urlValue.trim();
    if (!v) return;
    insertRow.mutate({ kind: "url", url: v, alt: urlAlt.trim(), sort_order: nextSort });
    setUrlValue("");
    setUrlAlt("");
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const a = media[i]!;
    const b = media[j]!;
    updateSort.mutate([
      { id: a.id, sort_order: b.sort_order },
      { id: b.id, sort_order: a.sort_order },
    ]);
  }

  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/30">
      <p className="text-sm font-semibold">{t("curriculum.media", "Media & bijlagen")}</p>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : media.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("curriculum.noMedia", "Nog geen media.")}</p>
      ) : (
        <ul className="space-y-2">
          {media.map((m, i) => (
            <li key={m.id} className="flex items-start gap-2 bg-background rounded-md border p-2">
              <div className="shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                {m.kind === "image" ? (
                  <img src={m.url} alt={m.alt ?? ""} className="w-full h-full object-cover" loading="lazy" />
                ) : m.kind === "video" ? (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                ) : (
                  <KindIcon kind={m.kind} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs font-medium">
                  <KindIcon kind={m.kind} />
                  <span className="uppercase">{m.kind}</span>
                </div>
                {m.alt && <p className="text-xs text-muted-foreground truncate">{m.alt}</p>}
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[10px] underline text-muted-foreground truncate block">
                  {m.url}
                </a>
                {m.kind === "audio" && <audio controls src={m.url} className="w-full mt-1 h-8" />}
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="outline" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => move(i, 1)} disabled={i === media.length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => delRow.mutate(m.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">{t("curriculum.uploadFile", "Bestand uploaden")}</Label>
          <div className="flex items-center gap-2">
            <Input
              ref={fileRef}
              type="file"
              accept="image/*,audio/*,video/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
              disabled={uploading}
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            <Upload className="h-3 w-3 inline mr-1" />
            {t("curriculum.uploadHint", "Beeld/audio/video/PDF → openbare URL.")}
          </p>
        </div>
        <div>
          <Label className="text-xs">{t("curriculum.externalUrl", "Externe URL")}</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
            />
            <Button size="sm" variant="outline" onClick={addUrl} disabled={!urlValue.trim()}>
              {t("common.add", "Toevoegen")}
            </Button>
          </div>
          <Input
            className="mt-2"
            placeholder={t("curriculum.altOptional", "Beschrijving (optioneel)")}
            value={urlAlt}
            onChange={(e) => setUrlAlt(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
