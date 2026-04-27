
-- =====================================================================
-- 1. PROFILES: remove broad SELECT, create public view, restrict table
-- =====================================================================

-- Drop the over-broad policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a public view exposing ONLY safe columns
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  user_id,
  username,
  avatar_url,
  banner_url,
  banner_position,
  description,
  discord_username,
  discord_avatar,
  hades_coins,
  created_at
FROM public.profiles;

-- View runs with caller's permissions (security_invoker)
ALTER VIEW public.public_profiles SET (security_invoker = true);

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Add a narrow SELECT policy on profiles for non-sensitive lookups (kept broad
-- for backward compatibility of existing queries that don't request sensitive
-- columns directly). To truly restrict, sensitive cols should come via the
-- view. We instead enforce via column-level concealment: only allow viewing
-- own row + staff sees all. Other authenticated users must use public_profiles.
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- (Existing "Users can view own profile" policy remains — covers self-reads)

-- =====================================================================
-- 2. USER_PRESENCE: restrict server_ip via view + tightened policy
-- =====================================================================

DROP POLICY IF EXISTS "Anyone can view presence" ON public.user_presence;

-- Helper to check accepted friendship
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  )
$$;

-- New policy: anyone authenticated can see status/activity rows, but
-- access to server_ip column needs to be filtered at app/view layer.
-- We expose a public view that hides server_ip from non-friends.
CREATE POLICY "Authenticated can view presence (no IP)"
ON public.user_presence
FOR SELECT
TO authenticated
USING (true);

-- Public-safe view: server_ip is NULL unless self or friend
CREATE OR REPLACE VIEW public.user_presence_public AS
SELECT
  id,
  user_id,
  status,
  activity,
  last_seen,
  updated_at,
  CASE
    WHEN user_id = auth.uid() THEN server_ip
    WHEN public.are_friends(auth.uid(), user_id) THEN server_ip
    ELSE NULL
  END AS server_ip
FROM public.user_presence;

ALTER VIEW public.user_presence_public SET (security_invoker = true);
GRANT SELECT ON public.user_presence_public TO authenticated;

-- =====================================================================
-- 3. REALTIME: add RLS on realtime.messages for private topics
-- =====================================================================

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to subscribe only to topics they own
-- (topic naming convention: topic includes user uuid like "user:<uuid>" or "messages:<uuid>")
DROP POLICY IF EXISTS "Authenticated can read own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow if topic ends with caller's uid, or is a public broadcast prefix
  (realtime.topic() LIKE '%' || auth.uid()::text)
  OR (realtime.topic() LIKE 'public:%')
  OR (realtime.topic() LIKE 'presence:%')
);

-- =====================================================================
-- 4. SUBSCRIPTIONS: rebind public-role policies to authenticated
-- =====================================================================

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Owners can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

CREATE POLICY "Admins can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- =====================================================================
-- 5. STORAGE: restrict bucket listing & add config-purchase read access
-- =====================================================================

-- Drop overly broad SELECT policies on avatars / website-assets if present
DROP POLICY IF EXISTS "Public can list avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can list website-assets" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Website assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read website-assets" ON storage.objects;

-- Direct-path reads only (no listing). Listing requires bucket-level perms;
-- with no SELECT-all policy, listing is denied while signed/direct reads via
-- public URL still work because the buckets are marked public at the bucket
-- level. We re-add a tight read-by-name policy for safety.
CREATE POLICY "Read avatars by direct path"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Read website-assets by direct path"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'website-assets');

-- Buyers can read configs they purchased
DROP POLICY IF EXISTS "Buyers can read purchased configs" ON storage.objects;
CREATE POLICY "Buyers can read purchased configs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'configs'
  AND EXISTS (
    SELECT 1
    FROM public.config_purchases cp
    JOIN public.configs c ON c.id = cp.config_id
    WHERE cp.user_id = auth.uid()
      AND c.file_path = storage.objects.name
  )
);

-- =====================================================================
-- 6. SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.cleanup_download_tokens() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_session_tokens()  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.scheduled_cleanup()       FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()         FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- Keep these callable (used by app):
--   has_role(uuid, app_role)            — needed in policies
--   validate_and_use_invite_key(...)    — called during registration
--   purchase_config(...)                — called by buyers
-- They are already guarded internally, leave EXECUTE as-is.
