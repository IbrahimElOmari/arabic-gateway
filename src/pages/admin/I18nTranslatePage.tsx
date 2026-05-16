import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Download, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiInvoke } from "@/lib/supabase-api";
import { logAdminAction } from "@/lib/admin-log";
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
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else if (typeof v === "string") out[key] = v;
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

interface BatchStatus {
  target: Target;
  index: number;
  total: number;
  size: number;
  status: "pending" | "running" | "ok" | "error";
  accepted: number;
  skipped: number;
  error?: string;
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
  const { user, role, roleStatus, isAdmin } = useAuth();

  const nlFlat = useMemo(() => flatten(nl), []);
  const enFlat = useMemo(() => flatten(en), []);
  const arFlat = useMemo(() => flatten(ar), []);

  const [doEn, setDoEn] = useState(true);
  const [doAr, setDoAr] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [limit, setLimit] = useState<string>("");

  const [running, setRunning] = useState(false);
  const [batches, setBatches] = useState<BatchStatus[]>([]);
  const [results, setResults] = useState<RunResult[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<RunResult | null>(null);
  const [skippedFilter, setSkippedFilter] = useState<Record<string, string>>({});
  const [skippedScope, setSkippedScope] = useState<Record<string, string>>({});

  const missingEn = useMemo(() => pickMissing(nlFlat, enFlat), [nlFlat, enFlat]);
  const missingAr = useMemo(() => pickMissing(nlFlat, arFlat), [nlFlat, arFlat]);

  const totalMissing =
    (doEn ? Object.keys(missingEn).length : 0) + (doAr ? Object.keys(missingAr).length : 0);

  const overallProgress = useMemo(() => {
    if (batches.length === 0) return 0;
    const done = batches.filter((b) => b.status === "ok" || b.status === "error").length;
    return Math.round((done / batches.length) * 100);
  }, [batches]);

  // Defense-in-depth guard (after all hooks).
  if (roleStatus === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !isAdmin || role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  async function runForTarget(
    target: Target,
    sourceFlat: FlatMap,
    currentFlat: FlatMap,
    lim: number,
    startIndex: number
  ): Promise<{ result: RunResult; nextIndex: number }> {
    const missing = pickMissing(sourceFlat, currentFlat, lim);
    const parts = chunk(missing, BATCH_SIZE);
    const added: RunResult["added"] = [];
    const skipped: string[] = [];
    let merged: FlatMap = { ...currentFlat };

    for (let i = 0; i < parts.length; i++) {
      const idx = startIndex + i;
      setBatches((prev) => prev.map((b, k) => (k === idx ? { ...b, status: "running" } : b)));
      try {
        const res = await apiInvoke<{ translations: Record<string, string>; skipped: string[] }>(
          "ai-translate-i18n",
          { target, entries: parts[i] },
          { timeoutMs: 60_000 }
        );
        let acc = 0;
        for (const [k, v] of Object.entries(res.translations || {})) {
          if (k in merged) continue;
          merged[k] = `${AI_PREFIX}${v}`;
          added.push({ key: k, source: parts[i][k], translation: v });
          acc++;
        }
        const sk = res.skipped || [];
        for (const k of sk) skipped.push(k);
        setBatches((prev) =>
          prev.map((b, k) =>
            k === idx ? { ...b, status: "ok", accepted: acc, skipped: sk.length } : b
          )
        );
      } catch (e: any) {
        const msg = e?.message || String(e);
        setBatches((prev) =>
          prev.map((b, k) => (k === idx ? { ...b, status: "error", error: msg } : b))
        );
        return {
          result: { target, added, skipped, merged, error: msg },
          nextIndex: startIndex + parts.length,
        };
      }
    }
    return { result: { target, added, skipped, merged }, nextIndex: startIndex + parts.length };
  }

  async function handleRun() {
    if (!doEn && !doAr) {
      toast({
        title: t("i18nAdmin.selectTarget", "Selecteer minstens één taal"),
        variant: "destructive",
      });
      return;
    }
    setRunning(true);
    setResults([]);
    const lim = limit ? Math.max(1, parseInt(limit, 10)) : Infinity;

    // Pre-compute all batch slots so the user sees the full plan up-front.
    const planned: BatchStatus[] = [];
    if (doEn) {
      const parts = chunk(pickMissing(nlFlat, enFlat, lim), BATCH_SIZE);
      parts.forEach((p, i) =>
        planned.push({
          target: "en",
          index: i,
          total: parts.length,
          size: Object.keys(p).length,
          status: "pending",
          accepted: 0,
          skipped: 0,
        })
      );
    }
    if (doAr) {
      const parts = chunk(pickMissing(nlFlat, arFlat, lim), BATCH_SIZE);
      parts.forEach((p, i) =>
        planned.push({
          target: "ar",
          index: i,
          total: parts.length,
          size: Object.keys(p).length,
          status: "pending",
          accepted: 0,
          skipped: 0,
        })
      );
    }
    setBatches(planned);

    // Audit: run started.
    void logAdminAction(user!.id, "i18n_translate_run_started", "i18n", undefined, {
      dryRun,
      targets: { en: doEn, ar: doAr },
      limit: lim === Infinity ? null : lim,
      plannedBatches: planned.length,
      totalMissing,
    });

    const out: RunResult[] = [];
    let cursor = 0;
    try {
      if (doEn) {
        const r = await runForTarget("en", nlFlat, enFlat, lim, cursor);
        cursor = r.nextIndex;
        out.push(r.result);
      }
      if (doAr) {
        const r = await runForTarget("ar", nlFlat, arFlat, lim, cursor);
        cursor = r.nextIndex;
        out.push(r.result);
      }
      setResults(out);

      const totals = out.map((r) => ({
        target: r.target,
        added: r.added.length,
        skipped: r.skipped.length,
        error: r.error || null,
      }));
      void logAdminAction(user!.id, "i18n_translate_run_completed", "i18n", undefined, {
        dryRun,
        totals,
      });

      const totalAdded = out.reduce((s, r) => s + r.added.length, 0);
      toast({
        title: dryRun
          ? t("i18nAdmin.dryRunDone")
          : t("i18nAdmin.runDone"),
        description: t("i18nAdmin.addedCount", "{{n}} vertalingen voorgesteld", { n: totalAdded }),
      });
    } finally {
      setRunning(false);
    }
  }

  function performDownload(r: RunResult) {
    const json = JSON.stringify(unflatten(r.merged), null, 2) + "\n";
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.target}.json`;
    a.click();
    URL.revokeObjectURL(url);

    void logAdminAction(user!.id, "i18n_translate_saved", "i18n", undefined, {
      target: r.target,
      addedCount: r.added.length,
      skippedCount: r.skipped.length,
      mode: dryRun ? "dry-run-export" : "save-export",
      filename: `${r.target}.json`,
    });

    toast({
      title: t("i18nAdmin.downloaded", "Bestand gedownload"),
      description: `${r.target}.json`,
    });
  }

  function requestDownload(r: RunResult) {
    setConfirmTarget(r);
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
              <span>{t("i18nAdmin.dryRun")}</span>
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

      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("i18nAdmin.batchStatus", "Batchstatus")}</CardTitle>
            <CardDescription>
              {t("i18nAdmin.batchProgress", {
                size: BATCH_SIZE,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={overallProgress} />
            <div className="text-xs text-muted-foreground">
              {batches.filter((b) => b.status === "ok" || b.status === "error").length}/{batches.length}{" "}
              {t("i18nAdmin.batchesDone", "batches verwerkt")}
            </div>
            <div className="rounded-lg border divide-y max-h-72 overflow-auto">
              {batches.map((b, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{b.target.toUpperCase()}</Badge>
                    <span className="font-mono text-xs">
                      #{b.index + 1}/{b.total}
                    </span>
                    <span className="text-muted-foreground">· {b.size} keys</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status === "pending" && (
                      <span className="text-muted-foreground text-xs">
                        {t("i18nAdmin.pending", "wacht")}
                      </span>
                    )}
                    {b.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {b.status === "ok" && (
                      <>
                        <Badge variant="secondary" className="text-xs">+{b.accepted}</Badge>
                        {b.skipped > 0 && (
                          <Badge variant="outline" className="text-xs">⚠ {b.skipped}</Badge>
                        )}
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </>
                    )}
                    {b.status === "error" && (
                      <span className="text-destructive text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {b.error?.slice(0, 60)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <Badge variant="secondary" className="ms-2">+{r.added.length}</Badge>
                    {r.skipped.length > 0 && (
                      <Badge variant="outline" className="ms-1">⚠ {r.skipped.length}</Badge>
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
                      onClick={() => requestDownload(r)}
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
                    <Alert>
                      <ShieldAlert className="h-4 w-4" />
                      <AlertDescription>
                        {t(
                          "i18nAdmin.skippedHint",
                          "{{n}} sleutels overgeslagen omdat de placeholders niet matchten of de AI geen geldige output gaf.",
                          { n: r.skipped.length }
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  {r.skipped.length > 0 && (() => {
                    const query = (skippedFilter[r.target] ?? "").trim().toLowerCase();
                    const scope = skippedScope[r.target] ?? "";
                    const topLevels = Array.from(
                      new Set(r.skipped.map((k) => k.split(".")[0]))
                    ).sort();
                    const filtered = r.skipped.filter((k) => {
                      if (scope && !k.startsWith(scope + ".") && k !== scope) return false;
                      if (query && !k.toLowerCase().includes(query)) return false;
                      return true;
                    });
                    return (
                      <div className="rounded-lg border">
                        <div className="px-3 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {t("i18nAdmin.skipped", "Overgeslagen sleutels")}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {filtered.length}/{r.skipped.length}
                          </Badge>
                          <div className="ms-auto flex flex-wrap items-center gap-2">
                            <div className="relative">
                              <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                              <Input
                                value={skippedFilter[r.target] ?? ""}
                                onChange={(e) =>
                                  setSkippedFilter((p) => ({ ...p, [r.target]: e.target.value }))
                                }
                                placeholder={t("i18nAdmin.searchKeys", "Zoek sleutel...")}
                                className="h-8 ps-7 pe-7 w-56 text-xs"
                              />
                              {(skippedFilter[r.target] ?? "") && (
                                <button
                                  type="button"
                                  aria-label={t("common.clear", "Wissen")}
                                  onClick={() =>
                                    setSkippedFilter((p) => ({ ...p, [r.target]: "" }))
                                  }
                                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <select
                              value={scope}
                              onChange={(e) =>
                                setSkippedScope((p) => ({ ...p, [r.target]: e.target.value }))
                              }
                              className="h-8 rounded-md border bg-background px-2 text-xs"
                            >
                              <option value="">
                                {t("i18nAdmin.allNamespaces", "Alle namespaces")}
                              </option>
                              {topLevels.map((ns) => (
                                <option key={ns} value={ns}>
                                  {ns}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <ScrollArea className="h-40">
                          {filtered.length > 0 ? (
                            <ul className="p-3 space-y-1 text-xs font-mono text-muted-foreground">
                              {filtered.map((k) => (
                                <li key={k}>{k}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="p-4 text-xs text-muted-foreground text-center">
                              {t("i18nAdmin.noMatches", "Geen sleutels gevonden voor deze filter.")}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    );
                  })()}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("i18nAdmin.confirmTitle", {
                lang: confirmTarget?.target.toUpperCase() ?? "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  {dryRun
                    ? t(
                        "i18nAdmin.confirmDry",
                        "Dry-run modus: het bestand wordt alleen lokaal gedownload. Niets in de live app verandert tot je het commit."
                      )
                    : t(
                        "i18nAdmin.confirmSave",
                        "Bewaar-modus: download het bestand en commit het naar de repo om de wijzigingen door te voeren."
                      )}
                </p>
                <ul className="list-disc ms-5 space-y-1">
                  <li>
                    {t("i18nAdmin.summaryAdded", "Toegevoegde sleutels: {{n}}", {
                      n: confirmTarget?.added.length ?? 0,
                    })}
                  </li>
                  <li>
                    {t("i18nAdmin.summarySkipped", "Overgeslagen: {{n}}", {
                      n: confirmTarget?.skipped.length ?? 0,
                    })}
                  </li>
                  <li>
                    {t("i18nAdmin.summaryPrefix", "Alle waarden krijgen prefix ⟦AI⟧ voor review")}
                  </li>
                  <li>
                    {t("i18nAdmin.summaryAudit", "Deze actie wordt vastgelegd in de admin-auditlog")}
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Annuleren")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmTarget) performDownload(confirmTarget);
                setConfirmTarget(null);
              }}
            >
              {t("i18nAdmin.confirmDownload", "Download bestand")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
