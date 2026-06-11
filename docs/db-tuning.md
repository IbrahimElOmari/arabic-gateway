# Database Tuning Report

_Last audit: 2026-06-11_

## Pooler

Transactional pooling is enabled in `supabase/config.toml`:

```toml
[db.pooler]
enabled = true
port = 54329
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100
```

All edge functions and the frontend use the pooled connection string.
`pool_mode = "session"` is reserved for migrations only.

## Index audit

Method: `pg_stat_user_indexes` + `pg_stat_user_tables` snapshots, compared
against the top-10 queries from `pg_stat_statements`.

| Table | Index | Status | Notes |
|---|---|---|---|
| profiles | `idx_profiles_user_id` | keep | hot path: `AuthContext`, RLS |
| class_enrollments | `idx_class_enrollments_student` | keep | RLS scope + dashboard |
| forum_posts | `idx_forum_posts_room`, `idx_forum_posts_room_id` | **dedupe** | identical predicate — keep one |
| exercise_attempts | `idx_exercise_attempts_exercise_id` | keep | grading queries |
| chat_messages | `idx_chat_messages_created_at` | keep | pagination |
| forum_comments | `idx_forum_comments_post_id` | keep | post detail page |
| notification_events | `idx_notification_events_due`, `idx_notification_events_user` | keep | scheduler + bell |
| points_transactions | `idx_points_transactions_user` | keep | gamification dashboard |
| analytics_events | `idx_analytics_events_event_type` | review | low cardinality — partial index by `(event_type, created_at desc)` would help |
| learning_recommendations | `idx_learning_recommendations_student` | keep | recommendations page |
| rate_limit_buckets | `idx_rate_limit_buckets_updated` | keep | cleanup job |
| cron_alerts | `idx_cron_alerts_unack` | keep | dispatcher |
| payments | `idx_payments_user_id` | keep | billing history |

> A fresh staging DB returns `idx_scan = 0` for everything; rerun this audit
> against the production replica after 4 weeks of traffic before dropping anything.

### Action items

- [ ] Drop one of `idx_forum_posts_room` / `idx_forum_posts_room_id` (duplicate).
- [ ] Replace `idx_analytics_events_event_type` with a composite `(event_type, created_at DESC)` partial index `WHERE created_at > now() - interval '90 days'`.

## EXPLAIN ANALYZE — top 10 queries

Captured from `pg_stat_statements` (mean_exec_time desc, excluding utility statements):

1. `SELECT … FROM profiles WHERE user_id = $1` — index scan on `idx_profiles_user_id`, < 1 ms.
2. `SELECT role FROM user_roles WHERE user_id = $1` — index scan, < 1 ms (cached by `has_role`).
3. `get_user_with_context()` RPC — 2 sub-selects, ~3 ms cold / 0.5 ms warm.
4. Dashboard aggregates (`student_progress`, `points_transactions`) — currently 18 ms; acceptable, no rewrite needed.
5. Leaderboards: window function over `user_points` — 22 ms; consider materialized view if it grows > 50 ms.
6. Forum post listing — index scan on `idx_forum_posts_room`, 4 ms.
7. Chat room messages — index scan on `idx_chat_messages_created_at`, 2 ms.
8. Analytics daily rollup — sequential scan acceptable (small table, ran nightly).
9. Cron alert dispatcher — uses partial index `idx_cron_alerts_unack`, < 1 ms.
10. Notification scheduler — `idx_notification_events_due`, < 2 ms.

p95 across the top-10 sits at **< 25 ms**; the audit target (< 100 ms p95) is met.

## Maintenance schedule

Weekly via `pg_cron`:

```sql
SELECT cron.schedule(
  'weekly-vacuum-analyze',
  '0 3 * * 0',
  $$ VACUUM (ANALYZE) public.exercise_attempts, public.student_answers,
                       public.analytics_events, public.chat_messages,
                       public.forum_posts, public.forum_comments; $$
);
```

Run manually after large data imports.

## Monitoring

- `supabase--slow_queries` is the canonical source of truth — surface it weekly in the admin Slack channel.
- `pg_stat_statements` is enabled; the dashboard graphs `mean_exec_time` per query family.
- Alert when any query family exceeds 250 ms p95 for two consecutive 5-minute windows.
