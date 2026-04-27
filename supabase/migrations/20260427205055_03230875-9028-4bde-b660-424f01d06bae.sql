
-- Remove the broad SELECT policies that allow LISTING of avatar/website-asset buckets.
-- Public buckets still serve files via direct CDN URLs (no SQL access needed).
DROP POLICY IF EXISTS "Read avatars by direct path" ON storage.objects;
DROP POLICY IF EXISTS "Read website-assets by direct path" ON storage.objects;

-- Move cleanup functions to a private schema so they're invisible to PostgREST/clients.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated, public;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- Recreate cleanup functions inside the private schema
CREATE OR REPLACE FUNCTION private.cleanup_download_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.download_tokens
  WHERE created_at < now() - interval '60 seconds' OR used = true;
$$;

CREATE OR REPLACE FUNCTION private.cleanup_session_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.session_tokens
  WHERE expires_at < now() OR revoked = true;
$$;

CREATE OR REPLACE FUNCTION private.scheduled_cleanup()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.session_tokens
  WHERE expires_at < now() - interval '1 hour' OR revoked = true;
  DELETE FROM public.download_tokens
  WHERE created_at < now() - interval '5 minutes' OR used = true;
$$;

-- Drop the public-schema duplicates so the linter stops flagging them
DROP FUNCTION IF EXISTS public.cleanup_download_tokens();
DROP FUNCTION IF EXISTS public.cleanup_session_tokens();
DROP FUNCTION IF EXISTS public.scheduled_cleanup();
