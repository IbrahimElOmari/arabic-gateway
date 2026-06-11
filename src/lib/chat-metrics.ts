/**
 * Chat metrics — latency, error-rate and realtime instrumentation for chat.
 *
 * - Captures latency per send and rolls up a 60-minute window for the debug UI.
 * - Tracks a rolling 60s window for SLO alerting.
 * - Records realtime connection status transitions.
 * - Every send carries a correlationId so logs/Sentry events can be traced.
 */
import { reportError, reportMessage } from "./error-monitor";
import { logger } from "./logger";

export type Channel = "private" | "group";
export type ChatOp = "send" | "subscribe";

export interface ChatSample {
  ts: number;
  channel: Channel;
  op: ChatOp;
  ok: boolean;
  latency_ms: number;
  correlation_id: string;
  attempt: number;
  error?: string;
  sentry_event_id?: string;
}


export interface RealtimeEvent {
  ts: number;
  channel: Channel;
  status: string;
  error?: string;
}

const ALERT_WINDOW_MS = 60_000;
const HISTORY_WINDOW_MS = 60 * 60_000; // 60 minutes
const SLO_LATENCY_MS = 1500;
const ERROR_RATE_ALERT = 0.2;
const MIN_SAMPLES_FOR_ALERT = 5;
const MAX_HISTORY = 2000;

const history: ChatSample[] = [];
const realtimeHistory: RealtimeEvent[] = [];
let lastAlertAt = 0;

function pruneHistory(now: number) {
  const cutoff = now - HISTORY_WINDOW_MS;
  while (history.length && history[0]!.ts < cutoff) history.shift();
  while (history.length > MAX_HISTORY) history.shift();
  while (realtimeHistory.length && realtimeHistory[0]!.ts < cutoff) realtimeHistory.shift();
  while (realtimeHistory.length > MAX_HISTORY) realtimeHistory.shift();
}

function maybeAlert(channel: Channel) {
  const now = Date.now();
  pruneHistory(now);
  const recent = history.filter((s) => s.ts >= now - ALERT_WINDOW_MS && s.channel === channel);
  if (recent.length < MIN_SAMPLES_FOR_ALERT) return;
  const errors = recent.filter((s) => !s.ok).length;
  const rate = errors / recent.length;
  const avg = Math.round(recent.reduce((a, s) => a + s.latency_ms, 0) / recent.length);
  if (rate >= ERROR_RATE_ALERT && now - lastAlertAt > ALERT_WINDOW_MS) {
    lastAlertAt = now;
    reportMessage(
      `chat.${channel} degradation: ${(rate * 100).toFixed(0)}% errors, avg ${avg}ms`,
      "warning",
      { channel, error_rate: rate, avg_latency_ms: avg, samples: recent.length },
    );
  }
}

export function newCorrelationId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* noop */ }
  return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface ChatTimer {
  end(ok: boolean, error?: unknown): number;
}

export function startChatTimer(
  channel: Channel,
  op: ChatOp = "send",
  meta: { correlationId?: string; attempt?: number } = {},
): ChatTimer {
  const start = performance.now();
  const correlation_id = meta.correlationId ?? newCorrelationId();
  const attempt = meta.attempt ?? 1;
  return {
    end(ok, error) {
      const latency_ms = Math.round(performance.now() - start);
      const errMsg = error instanceof Error ? error.message : error ? String(error) : undefined;
      let sentry_event_id: string | undefined;
      if (!ok && error) {
        sentry_event_id = `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      }
      history.push({ ts: Date.now(), channel, op, ok, latency_ms, correlation_id, attempt, error: errMsg, sentry_event_id });
      pruneHistory(Date.now());
      logger.info(`[chat-metrics] ${channel}.${op} cid=${correlation_id} attempt=${attempt} ok=${ok} ${latency_ms}ms${sentry_event_id ? ` sentry=${sentry_event_id}` : ""}`);
      if (!ok && error) {
        reportError(error, { area: "chat", channel, op, latency_ms, correlation_id, attempt, sentry_event_id });
      } else if (ok && latency_ms > SLO_LATENCY_MS) {
        reportMessage(`chat.${channel}.${op} slow: ${latency_ms}ms`, "warning", {
          channel, op, latency_ms, slo_ms: SLO_LATENCY_MS, correlation_id, attempt,
        });
      }
      maybeAlert(channel);
      return latency_ms;
    },

  };
}

export function recordRealtimeStatus(channel: Channel, status: string, error?: unknown) {
  const errMsg = error instanceof Error ? error.message : error ? String(error) : undefined;
  realtimeHistory.push({ ts: Date.now(), channel, status, error: errMsg });
  pruneHistory(Date.now());
  logger.info(`[chat-metrics] realtime ${channel}: ${status}`);
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    reportError(error ?? new Error(`Realtime ${status}`), { area: "chat", channel, op: "realtime", status });
  }
}

export function getChatMetricsSnapshot() {
  const now = Date.now();
  pruneHistory(now);
  const recent = history.filter((s) => s.ts >= now - ALERT_WINDOW_MS);
  const errors = recent.filter((s) => !s.ok).length;
  return {
    samples: recent.length,
    error_rate: recent.length ? errors / recent.length : 0,
    avg_latency_ms: recent.length
      ? Math.round(recent.reduce((a, s) => a + s.latency_ms, 0) / recent.length)
      : 0,
  };
}

export function getChatHistory(): { samples: ChatSample[]; realtime: RealtimeEvent[] } {
  pruneHistory(Date.now());
  return { samples: [...history], realtime: [...realtimeHistory] };
}

/** Retry helper: exponential backoff capped at maxAttempts. */
export async function sendWithRetry<T>(
  fn: (attempt: number, correlationId: string) => Promise<T>,
  opts: {
    correlationId: string;
    channel: Channel;
    maxAttempts?: number;
    baseDelayMs?: number;
    onAttempt?: (attempt: number) => void;
  },
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelay = opts.baseDelayMs ?? 400;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    opts.onAttempt?.(attempt);
    const timer = startChatTimer(opts.channel, "send", { correlationId: opts.correlationId, attempt });
    try {
      const result = await fn(attempt, opts.correlationId);
      timer.end(true);
      return result;
    } catch (err) {
      timer.end(false, err);
      lastErr = err;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}
