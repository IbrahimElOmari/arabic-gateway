import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Download, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiInvoke } from "@/lib/supabase-api";
import nl from "@/i18n/locales/nl.json";
import en from "@/i18n/locales/en.json";
import ar from "@/i18n/locales/ar.json";

const AI_PREFIX = "⟦AI⟧ ";
const BATCH_SIZE = 30;

type Target = "en" | "ar";
type FlatMap = Record<string, string>;

function flatten(obj: any, prefix = ""): FlatMap {
  const out: FlatMap = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else if (typeof v === "string") {
      out[key] = v;
    }
  }
  return out;
}

function unflatten(flat: FlatMap): any {
  const out: any = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = v;
  }
  return out;
}

function pickMissing(src: FlatMap, tgt: FlatMap, limit = Infinity): FlatMap {
  const out: FlatMap = {};
  let n = 0;
  for (const [k, v] of Object.entries(src)) {
    if (n >= limit) break;
    if (!(k in tgt)) {
      out[k] = v;
      n++;
    }
  }
  return out;
}

function chunk<T extends Record<string, string>>(obj: T, size: number): T[] {
  const entries = Object.entries(obj);
  const out: any[] = [];
  for (let i = 0; i < entries.length; i += size) {
    out.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  return out;
}

interface RunResult {
  target: Target;
  added: Array<{ key: string; source: string; translation: string }>;
  skipped: string[];
  merged: FlatMap;
  error?: string;
}

export default function I18nTranslatePage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const nlFlat = useMemo(() => flatten(nl), []);
  const enFlat = useMemo(() => flatten(en), []);
  const arFlat = useMemo(() => flatten(ar), []);

  const [doEn, setDoEn] = useState(true);
  const [doAr, setDoAr] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [limit, setLimit] = useState<string>("");

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<RunResult[]>([]);

  const missingEn = useMemo(() => pickMissing(nlFlat, enFlat), [nlFlat, enFlat]);
  const missingAr = useMemo(() => pickMissing(nlFlat, arFlat), [nlFlat, arFlat]);

  const totalMissing = (doEn ? Object.keys(missingEn).length : 0) + (doAr ? Object.keys(missingAr).length : 0);

  async function runForTarget(target: Target, sourceFlat: FlatMap, currentFlat: FlatMap, lim: number): Promise<RunResult> {
    const missing = pickMissing(sourceFlat, currentFlat, lim);
    const batches = chunk(missing, BATCH_SIZE);
    const added: RunResult["added"] = [];
    const skipped: string[] = [];
    let merged: FlatMap = { ...currentFlat };

    for (let i = 0; i < batches.length; i++) {
      try {
        const res = await apiInvoke<{ translations: Record<string, string>; skipped: string[] }>(
          "ai-translate-i18n",
          { target, entries: batches[i] },
          { timeoutMs: 60_000 }
        );
        for (const [k, v] of Object.entries(res.translations || {})) {
          if (k in merged) continue;
          merged[k] = `${AI_PREFIX}${v}`;
          added.push({ key: k, source: batches[i][k], translation: v });
        }
        for (const k of res.skipped || []) skipped.push(k);
      } catch (e: any) {
        return {
          target,
          added,
          skipped,
          merged,
          error: e?.message || String(e),
        };
      }
      setProgress((p) => (p ? { ...p, done: p.done + Object.keys(batches[i]).length } : p));
    }
    return { target, added, skipped, merged };
  }

  async function handleRun() {
    if (!doEn && !doAr) {
      toast({ title: t("i18nAdmin.selectTarget", "Selecteer minstens één taal"), variant: "destructive" });
      return;
    }
    setRunning(true);
    setResults([]);
    setProgress({ done: 0, total: totalMissing });
    const lim = limit ? Math.max(1, parseInt(limit, 10)) : Infinity;
    const out: RunResult[] = [];
    try {
      if (doEn) out.push(await runForTarget("en", nlFlat, enFlat, lim));
      if (doAr) out.push(await runForTarget("ar", nlFlat, arFlat, lim));
      setResults(out);
      const totalAdded = out.reduce((s, r) => s + r.added.length, 0);
      toast({
        title: dryRun
          ? t("i18nAdmin.dryRunDone", "Dry-run voltooid")
          : t("i18nAdmin.runDone", "Vertaling voltooid"),
        description: t("i18nAdmin.addedCount", "{{n}} vertalingen voorgesteld", { n: totalAdded }),
      });
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  function downloadJson(target: Target, merged: FlatMap) {
    const json = JSON.stringify(unflatten(merged), null, 2) + "\n";
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          {t("i18nAdmin.title", "AI vertaal-workflow")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t(
            "i18nAdmin.subtitle",
            "Vul ontbrekende EN/AR keys aan met AI-suggesties op basis van de NL bron."
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("i18nAdmin.overview", "Overzicht")}</CardTitle>
          <CardDescription>
            {t("i18nAdmin.overviewDesc", "Aantal ontbrekende sleutels ten opzichte van Nederlands.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">NL</div>
            <div className="text-2xl font-semibold">{Object.keys(nlFlat).length}</div>
            <div className="text-xs text-muted-foreground">{t("i18nAdmin.totalKeys", "totaal")}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">EN</div>
            <div className="text-2xl font-semibold">{Object.keys(missingEn).length}</div>
            <div className="text-xs text-muted-foreground">{t("i18nAdmin.missing", "ontbrekend")}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">AR</div>
            <div className="text-2xl font-semibold">{Object.keys(missingAr).length}</div>
            <div className="text-xs text-muted-foreground">{t("i18nAdmin.missing", "ontbrekend")}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("i18nAdmin.config", "Configuratie")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <Checkbox checked={doEn} onCheckedChange={(v) => setDoEn(!!v)} />
              <span>EN ({Object.keys(missingEn).length})</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={doAr} onCheckedChange={(v) => setDoAr(!!v)} />
              <span>AR ({Object.keys(missingAr).length})</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(!!v)} />
              <span>{t("i18nAdmin.dryRun", "Dry-run (niets opslaan)")}</span>
            </label>
          </div>
          <div className="flex flex-col gap-2 max-w-xs">
            <Label htmlFor="limit">{t("i18nAdmin.limit", "Limiet (optioneel)")}</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              placeholder="bv. 50"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleRun} disabled={running || totalMissing === 0}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("i18nAdmin.runBtn", "Vertaling starten")}
            </Button>
            {progress && (
              <span className="text-sm text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            )}
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t(
                "i18nAdmin.warning",
                "AI-vertalingen krijgen het prefix ⟦AI⟧ zodat ze later eenvoudig te reviewen zijn. Download het bijgewerkte bestand en commit het naar de repo om de wijziging permanent te maken."
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("i18nAdmin.results", "Resultaten")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={results[0].target}>
              <TabsList>
                {results.map((r) => (
                  <TabsTrigger key={r.target} value={r.target}>
                    {r.target.toUpperCase()}{" "}
                    <Badge variant="secondary" className="ms-2">
                      +{r.added.length}
                    </Badge>
                    {r.skipped.length > 0 && (
                      <Badge variant="outline" className="ms-1">
                        ⚠ {r.skipped.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {results.map((r) => (
                <TabsContent key={r.target} value={r.target} className="space-y-4">
                  {r.error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{r.error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {t("i18nAdmin.addedSummary", "{{n}} sleutels toegevoegd", { n: r.added.length })}
                      {r.skipped.length > 0 && (
                        <span>· {t("i18nAdmin.skippedSummary", "{{n}} overgeslagen", { n: r.skipped.length })}</span>
                      )}
                    </div>
                    <Button
                      variant={dryRun ? "outline" : "default"}
                      size="sm"
                      onClick={() => downloadJson(r.target, r.merged)}
                      disabled={r.added.length === 0}
                    >
                      <Download className="h-4 w-4" />
                      {t("i18nAdmin.download", "Download {{lang}}.json", { lang: r.target })}
                    </Button>
                  </div>

                  {r.added.length > 0 && (
                    <div className="rounded-lg border">
                      <div className="px-3 py-2 border-b bg-muted/30 text-sm font-medium">
                        {t("i18nAdmin.added", "Toegevoegd")}
                      </div>
                      <ScrollArea className="h-96">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-card border-b">
                            <tr className="text-start">
                              <th className="text-start p-2 font-medium w-1/3">{t("i18nAdmin.key", "Sleutel")}</th>
                              <th className="text-start p-2 font-medium">NL</th>
                              <th className="text-start p-2 font-medium">{r.target.toUpperCase()}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.added.map((row) => (
                              <tr key={row.key} className="border-b last:border-0 align-top">
                                <td className="p-2 font-mono text-xs text-muted-foreground break-all">{row.key}</td>
                                <td className="p-2">{row.source}</td>
                                <td className="p-2" dir={r.target === "ar" ? "rtl" : "ltr"}>
                                  {row.translation}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </div>
                  )}

                  {r.skipped.length > 0 && (
                    <div className="rounded-lg border">
                      <div className="px-3 py-2 border-b bg-muted/30 text-sm font-medium">
                        {t("i18nAdmin.skipped", "Overgeslagen (placeholder mismatch of leeg)")}
                      </div>
                      <ScrollArea className="h-40">
                        <ul className="p-3 space-y-1 text-xs font-mono text-muted-foreground">
                          {r.skipped.map((k) => (
                            <li key={k}>{k}</li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
