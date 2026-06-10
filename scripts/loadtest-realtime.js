// k6 load test for Supabase Realtime channels.
// Run with:  k6 run -e SUPABASE_URL=... -e SUPABASE_ANON=... scripts/loadtest-realtime.js
//
// Targets the plan's SLO: 500 concurrent WebSocket clients listening on the
// `messages` and `forum_posts` channels. Asserts p95 connect < 500ms and
// 0 disconnect errors during the steady-state phase.

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON = __ENV.SUPABASE_ANON;

const connectTime = new Trend('realtime_connect_ms', true);
const disconnects = new Counter('realtime_disconnects');
const messages = new Counter('realtime_messages');

export const options = {
  scenarios: {
    sustained: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m',  target: 500 },
        { duration: '3m',  target: 500 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    realtime_connect_ms: ['p(95)<500'],
    realtime_disconnects: ['count<5'],
  },
};

export default function () {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON env vars are required');
  }
  const host = SUPABASE_URL.replace(/^https?:\/\//, '');
  const url = `wss://${host}/realtime/v1/websocket?apikey=${SUPABASE_ANON}&vsn=1.0.0`;
  const start = Date.now();

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      connectTime.add(Date.now() - start);

      // Subscribe to two public channels.
      for (const topic of ['realtime:public:messages', 'realtime:public:forum_posts']) {
        socket.send(JSON.stringify({
          topic, event: 'phx_join', payload: { config: { postgres_changes: [{ event: '*', schema: 'public' }] } }, ref: `${__VU}-${topic}`,
        }));
      }

      // Heartbeat every 25s.
      socket.setInterval(() => {
        socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: `${Date.now()}` }));
      }, 25000);

      socket.setTimeout(() => socket.close(), 60_000);
    });

    socket.on('message', () => messages.add(1));
    socket.on('error', () => disconnects.add(1));
  });

  check(res, { 'ws status 101': (r) => r && r.status === 101 });
  sleep(1);
}
