-- 1. Restrict file_path column on configs from being read by anon/authenticated.
--    Service role still has full access. Edge functions use service role to fetch
--    file_path and create signed URLs.
REVOKE SELECT (file_path) ON public.configs FROM anon, authenticated;

-- 2. Lock down rate_limit_log: only staff can read; no one (other than service
--    role / SECURITY DEFINER) can insert or modify.
DROP POLICY IF EXISTS "Staff can view rate limit log" ON public.rate_limit_log;
CREATE POLICY "Staff can view rate limit log"
  ON public.rate_limit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Block any direct INSERT/UPDATE/DELETE from clients (service role bypasses RLS).
DROP POLICY IF EXISTS "Block client writes to rate limit log" ON public.rate_limit_log;
CREATE POLICY "Block client writes to rate limit log"
  ON public.rate_limit_log
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 3. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated.
--    These are only called from server-side edge functions using the service role.
--    purchase_config remains executable by authenticated users (called via RPC from client).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_and_use_invite_key(text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_log() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;