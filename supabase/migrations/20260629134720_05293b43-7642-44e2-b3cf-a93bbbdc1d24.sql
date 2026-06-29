
CREATE OR REPLACE FUNCTION public._seed_vault_secret(p_name text, p_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_catalog
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = p_name;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(p_value, p_name, 'Seeded for pg_cron jobs');
    RETURN 'created';
  ELSE
    PERFORM vault.update_secret(v_id, p_value, p_name, 'Seeded for pg_cron jobs');
    RETURN 'updated';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._seed_vault_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._seed_vault_secret(text, text) TO service_role;
