# Realtime capacity & reconnect strategy

## SLOs

| Metric                       | Target |
|------------------------------|--------|
| Concurrent WS clients        | ≥ 500  |
| Connect latency (p95)        | < 500 ms |
| Steady-state disconnects/min | 0 |
| Message loss                 | 0 % |
| Reconnect after network drop | ≤ 30 s |

## Loadtest

Script: `scripts/loadtest-realtime.js` (k6, WebSocket protocol).
Ramps to 500 VUs, each subscribed to `public.messages` and `public.forum_posts`, with heartbeats every 25 s.

Run locally:
```bash
k6 run \
  -e SUPABASE_URL=$VITE_SUPABASE_URL \
  -e SUPABASE_ANON=$VITE_SUPABASE_PUBLISHABLE_KEY \
  scripts/loadtest-realtime.js
```

Thresholds fail the run when `p95 connect ≥ 500 ms` or `disconnects ≥ 5`. Output is JSON-summary; archive via `--summary-export results.json` for trend tracking.

## Client reconnect strategy

The Supabase JS client already implements exponential backoff for `realtime`. We layer two safety nets in the app:

1. **`OfflineBanner`** (`src/components/OfflineBanner.tsx`) — listens to `navigator.onLine` and surfaces a banner when the browser loses connectivity, so users know subscriptions may lag.
2. **`useRateLimiter`** — wraps mutation handlers to prevent client-side runaway loops when a channel re-emits on reconnect.

Backoff sequence (built-in): 1s · 2s · 5s · 10s · 30s · 30s … capped, with jitter.

## Channel scoping rules

Always filter on the channel side, never in JS:

```ts
supabase
  .channel(`messages:room:${roomId}`)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      handler)
  .subscribe();
```

This keeps per-VU bandwidth proportional to actual interest and lets us scale beyond 500 idle subscribers without hitting the per-project message budget.

## Capacity review

- Re-run the loadtest before any change to realtime publications (`ALTER PUBLICATION supabase_realtime`).
- After major schema changes, profile p95 again — wide row payloads multiply egress.
- Document the latest run summary in `docs/runbook.md` under "Realtime".
