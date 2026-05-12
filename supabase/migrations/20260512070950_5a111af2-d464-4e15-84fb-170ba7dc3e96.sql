-- Fix 11: Remove duplicate indexes that are identical to existing shorter-named indexes.
-- Each dropped index has an exact duplicate that is kept.
-- NOTE: DROP INDEX CONCURRENTLY cannot run inside a transaction block; Supabase
-- migrations are wrapped in a transaction, so we use plain DROP INDEX IF EXISTS.

DROP INDEX IF EXISTS public.idx_class_enrollments_student_id;
DROP INDEX IF EXISTS public.idx_exercise_attempts_student_id;
DROP INDEX IF EXISTS public.idx_user_badges_user_id;
DROP INDEX IF EXISTS public.idx_points_transactions_user_id;