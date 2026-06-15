
-- Extend subscriptions for Paddle
ALTER TABLE public.subscriptions
  ALTER COLUMN class_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_env ON public.subscriptions(user_id, environment);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_id ON public.subscriptions(paddle_subscription_id);

-- Allow service role full access (webhook writes)
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.subscriptions TO service_role;

-- Classes: per-class Paddle price IDs (human-readable external IDs)
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS paddle_product_id text,
  ADD COLUMN IF NOT EXISTS paddle_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS paddle_price_id_yearly text,
  ADD COLUMN IF NOT EXISTS price_monthly numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_yearly numeric(10,2),
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0;

-- Extra one-time products (literature etc.)
CREATE TABLE IF NOT EXISTS public.extra_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  paddle_product_id text,
  paddle_price_id text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.extra_products TO authenticated;
GRANT ALL ON public.extra_products TO service_role;
ALTER TABLE public.extra_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active extras"
  ON public.extra_products FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage extras"
  ON public.extra_products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_extra_products_updated_at
  BEFORE UPDATE ON public.extra_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- has_active_subscription helper
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status::text IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status::text = 'canceled' AND current_period_end > now())
      )
  );
$$;
