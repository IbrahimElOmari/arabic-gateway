ALTER TABLE public.user_onboarding_state
DROP CONSTRAINT IF EXISTS user_onboarding_state_user_id_key;

ALTER TABLE public.user_onboarding_state
ADD CONSTRAINT user_onboarding_state_user_id_role_key UNIQUE (user_id, role);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_role
ON public.user_onboarding_state(user_id, role);