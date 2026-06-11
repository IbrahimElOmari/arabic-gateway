import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Activity, AlertTriangle, CheckCircle2, Radio } from "lucide-react";
import { getChatHistory, type ChatSample, type RealtimeEvent } from "@/lib/chat-metrics";

const WINDOWS = [
  { id: "5m", label: "5 min", ms: 5 * 60_000 },
  { id: "15m", label: "15 min", ms: 15 * 60_000 },
  { id: "60m", label: "60 min", ms: 60 * 60_000 },
] as const;

function summarize(samples: ChatSample[]) {
  if (samples.length === 0) {
    return { count: 0, errorRate: 0, avg: 0, p95: 0, errors: 0 };
  }
  const sorted = [...samples].map((s) => s.latency_ms).sort((a, b) => a - b);
  const errors = samples.filter((s) => !s.ok).length;
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
  return { count: samples.length, errorRate: errors / samples.length, avg, p95, errors };
}

export default function ChatDebugPage() {
  const [tick, setTick] = useState(0);
  const [windowMs, setWindowMs] = useState<number>(60 * 60_000);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const { samples, realtime } = getChatHistory();
  const now = Date.now();
  const inWindow = (ts: number) => ts >= now - windowMs;
  const privateSamples = samples.filter((s) => s.channel === "private" && inWindow(s.ts));
  const groupSamples = samples.filter((s) => s.channel === "group" && inWindow(s.ts));
  const realtimeRecent = realtime.filter((e) => inWindow(e.ts)).slice(-50).reverse();
  const lastPrivateRt = [...realtime].reverse().find((r) => r.channel === "private");

  const priv = summarize(privateSamples);
  const grp = summarize(groupSamples);

  const rtState = lastPrivateRt?.status ?? "UNKNOWN";
  const rtOk = rtState === "SUBSCRIBED";

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6" /> Chat debug
          </h1>
          <p className="text-sm text-muted-foreground">
            Live latency, foutpercentages en realtime-status (laatste 60 min). Tick #{tick}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {WINDOWS.map((w) => (
            <Button
              key={w.id}
              size="sm"
              variant={windowMs === w.ms ? "default" : "outline"}
              onClick={() => setWindowMs(w.ms)}
            >
              {w.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setTick((t) => t + 1)} aria-label="Vernieuwen">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChannelCard title="Privéchat" stats={priv} />
        <ChannelCard title="Groepschat" stats={grp} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4" /> Realtime status (privéchat)
            <Badge variant={rtOk ? "default" : "destructive"} className="ms-2">{rtState}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {realtimeRecent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen realtime-events in dit venster.</p>
          ) : (
            <ul className="text-xs font-mono space-y-1 max-h-64 overflow-auto">
              {realtimeRecent.map((e: RealtimeEvent, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span className="uppercase">{e.channel}</span>
                  <span className={e.status === "SUBSCRIBED" ? "text-success" : "text-destructive"}>
                    {e.status}
                  </span>
                  {e.error && <span className="text-destructive truncate">{e.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recente sends (laatste 30)</CardTitle>
        </CardHeader>
        <CardContent>
          {privateSamples.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen sends in dit venster.</p>
          ) : (
            <ul className="text-xs font-mono space-y-1 max-h-72 overflow-auto">
              {[...privateSamples].slice(-30).reverse().map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-muted-foreground">{new Date(s.ts).toLocaleTimeString()}</span>
                  <span className="text-muted-foreground">cid={s.correlation_id.slice(0, 8)}</span>
                  <span>try#{s.attempt}</span>
                  <span>{s.latency_ms}ms</span>
                  {s.ok ? (
                    <span className="text-success inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> ok</span>
                  ) : (
                    <span className="text-destructive inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {s.error?.slice(0, 60)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelCard({ title, stats }: { title: string; stats: ReturnType<typeof summarize> }) {
  const errorPct = (stats.errorRate * 100).toFixed(1);
  const errBad = stats.errorRate >= 0.2;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Berichten" value={stats.count.toString()} />
        <Stat label="Fouten" value={`${stats.errors} (${errorPct}%)`} tone={errBad ? "bad" : "ok"} />
        <Stat label="Gem. latency" value={`${stats.avg} ms`} tone={stats.avg > 1500 ? "bad" : "ok"} />
        <Stat label="p95 latency" value={`${stats.p95} ms`} tone={stats.p95 > 2500 ? "bad" : "ok"} />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${tone === "bad" ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
