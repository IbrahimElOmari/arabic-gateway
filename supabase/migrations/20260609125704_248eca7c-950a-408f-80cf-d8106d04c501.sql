
CREATE TABLE public.rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  tokens double precision NOT NULL,
  last_refill timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier, action)
);

GRANT ALL ON public.rate_limit_buckets TO service_role;

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.rate_limit_buckets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_rate_limit_buckets_updated ON public.rate_limit_buckets(updated_at);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_identifier text,
  p_action text,
  p_capacity integer,
  p_refill_per_sec double precision,
  p_cost integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.rate_limit_buckets%ROWTYPE;
  v_elapsed double precision;
  v_new_tokens double precision;
  v_allowed boolean;
  v_retry double precision;
BEGIN
  INSERT INTO public.rate_limit_buckets (identifier, action, tokens, last_refill)
  VALUES (p_identifier, p_action, p_capacity, v_now)
  ON CONFLICT (identifier, action) DO NOTHING;

  SELECT * INTO v_row FROM public.rate_limit_buckets
    WHERE identifier = p_identifier AND action = p_action
    FOR UPDATE;

  v_elapsed := EXTRACT(EPOCH FROM (v_now - v_row.last_refill));
  v_new_tokens := LEAST(p_capacity::double precision, v_row.tokens + v_elapsed * p_refill_per_sec);

  IF v_new_tokens >= p_cost THEN
    v_new_tokens := v_new_tokens - p_cost;
    v_allowed := true;
    v_retry := 0;
  ELSE
    v_allowed := false;
    v_retry := CEIL((p_cost - v_new_tokens) / NULLIF(p_refill_per_sec, 0));
  END IF;

  UPDATE public.rate_limit_buckets
    SET tokens = v_new_tokens,
        last_refill = v_now,
        updated_at = v_now
    WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', FLOOR(v_new_tokens),
    'retry_after_seconds', v_retry
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_buckets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limit_buckets
    WHERE updated_at < now() - interval '24 hours'
    RETURNING 1 INTO v_deleted;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
