/**
 * Chat metrics — latency & error-rate instrumentation for private chat.
 *
 * - Captures latency per send and rolls up a 60s success/error rate.
 * - Forwards anomalies to error-monitor (Sentry when DSN is set, otherwise
 *   analytics edge function via logError).
 * - Keeps an in-memory rolling window so the existing notification stack
 *   can show degradation without extra infra.
 */
import { reportError, reportMessage } from "./error-monitor";
import { logger } from "./logger";

type Sample = { ts: number; ok: boolean; latency_ms: number };

const WINDOW_MS = 60_000;
const SLO_LATENCY_MS = 1500;
const ERROR_RATE_ALERT = 0.2; // 20%
const MIN_SAMPLES_FOR_ALERT = 5;

const samples: Sample[] = [];
let lastAlertAt = 0;

function prune(now: number) {
  const cutoff = now - WINDOW_MS;
  while (samples.length && samples[0]!.ts < cutoff) samples.shift();
}

function maybeAlert(channel: "private" | "group") {
  const now = Date.now();
  prune(now);
  if (samples.length < MIN_SAMPLES_FOR_ALERT) return;
  const errors = samples.filter((s) => !s.ok).length;
  const rate = errors / samples.length;
  const avgLatency = Math.round(
    samples.reduce((a, s) => a + s.latency_ms, 0) / samples.length,
  );
  if (rate >= ERROR_RATE_ALERT && now - lastAlertAt > WINDOW_MS) {
    lastAlertAt = now;
    reportMessage(
      `chat.${channel} degradation: ${(rate * 100).toFixed(0)}% errors, avg ${avgLatency}ms`,
      "warning",
      { channel, error_rate: rate, avg_latency_ms: avgLatency, samples: samples.length },
    );
  }
}

export interface ChatTimer {
  end(ok: boolean, error?: unknown): number;
}

export function startChatTimer(
  channel: "private" | "group",
  op: "send" | "subscribe" = "send",
): ChatTimer {
  const start = performance.now();
  return {
    end(ok, error) {
      const latency_ms = Math.round(performance.now() - start);
      samples.push({ ts: Date.now(), ok, latency_ms });
      logger.info(`[chat-metrics] ${channel}.${op}`, { ok, latency_ms });
      if (!ok && error) {
        reportError(error, { area: "chat", channel, op, latency_ms });
      } else if (ok && latency_ms > SLO_LATENCY_MS) {
        reportMessage(`chat.${channel}.${op} slow: ${latency_ms}ms`, "warning", {
          channel,
          op,
          latency_ms,
          slo_ms: SLO_LATENCY_MS,
        });
      }
      maybeAlert(channel);
      return latency_ms;
    },
  };
}

export function recordRealtimeStatus(
  channel: "private" | "group",
  status: string,
  error?: unknown,
) {
  logger.info(`[chat-metrics] realtime ${channel}: ${status}`);
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    reportError(error ?? new Error(`Realtime ${status}`), {
      area: "chat",
      channel,
      op: "realtime",
      status,
    });
  }
}

export function getChatMetricsSnapshot() {
  prune(Date.now());
  const errors = samples.filter((s) => !s.ok).length;
  return {
    samples: samples.length,
    error_rate: samples.length ? errors / samples.length : 0,
    avg_latency_ms: samples.length
      ? Math.round(samples.reduce((a, s) => a + s.latency_ms, 0) / samples.length)
      : 0,
  };
}
