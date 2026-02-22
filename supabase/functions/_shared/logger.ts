/**
 * Structured logger for Edge Functions
 * Outputs JSON-formatted logs with consistent fields for observability.
 */

export interface LogContext {
  function_name: string;
  request_id: string;
  user_id?: string;
}

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, ctx: LogContext, message: string, extra?: Record<string, unknown>) {
  const entry = {
    level,
    function_name: ctx.function_name,
    request_id: ctx.request_id,
    user_id: ctx.user_id ?? null,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export function createLogger(functionName: string, req?: Request) {
  const requestId = req?.headers.get("x-request-id") ?? crypto.randomUUID();

  const ctx: LogContext = {
    function_name: functionName,
    request_id: requestId,
  };

  return {
    setUserId(uid: string) {
      ctx.user_id = uid;
    },
    info(message: string, extra?: Record<string, unknown>) {
      log("info", ctx, message, extra);
    },
    warn(message: string, extra?: Record<string, unknown>) {
      log("warn", ctx, message, extra);
    },
    error(message: string, extra?: Record<string, unknown>) {
      log("error", ctx, message, extra);
    },
    debug(message: string, extra?: Record<string, unknown>) {
      log("debug", ctx, message, extra);
    },
    /** Wraps an async handler to log duration and errors automatically */
    async withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const start = performance.now();
      try {
        const result = await fn();
        const duration_ms = Math.round(performance.now() - start);
        log("info", ctx, `${label} completed`, { duration_ms });
        return result;
      } catch (err) {
        const duration_ms = Math.round(performance.now() - start);
        const errorMessage = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        log("error", ctx, `${label} failed`, { duration_ms, error: errorMessage, stack });
        throw err;
      }
    },
    requestId,
  };
}
