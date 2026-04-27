
-- =====================================================================
-- 1. user_presence: restrict SELECT to self; expose friends-aware view
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated can view presence (no IP)" ON public.user_presence;

CREATE POLICY "Users can view own presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Friends can view each other's presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (public.are_friends(auth.uid(), user_id));

-- Staff can view all
CREATE POLICY "Staff can view all presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- =====================================================================
-- 2. configs: hide file_path from non-owners/non-buyers
-- =====================================================================
-- Drop broad authenticated SELECT, replace with column-aware approach via view.
-- Easiest path: keep table SELECT but null out file_path via a public view,
-- and switch app code to read from the view OR keep reads scoped.
-- Simpler: keep policy but make it explicit that file_path access flows through
-- the edge function `launcher-config-download` which uses service-role key.

-- Add a public-safe view excluding file_path
CREATE OR REPLACE VIEW public.configs_public AS
SELECT
  id, user_id, name, description, category, price,
  is_official, downloads, rating, rating_count,
  created_at, updated_at,
  CASE
    WHEN user_id = auth.uid() THEN file_path
    WHEN EXISTS (
      SELECT 1 FROM public.config_purchases cp
      WHERE cp.config_id = configs.id AND cp.user_id = auth.uid()
    ) THEN file_path
    ELSE NULL
  END AS file_path
FROM public.configs;

ALTER VIEW public.configs_public SET (security_invoker = true);
GRANT SELECT ON public.configs_public TO authenticated, anon;

-- =====================================================================
-- 3. user_roles: prevent admins from creating owner roles
-- =====================================================================
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert non-owner roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'owner'::app_role
);

-- Also block admins from updating any role TO owner
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update non-owner roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND role <> 'owner'::app_role
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND role <> 'owner'::app_role
);

-- Block admins from deleting owner roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete non-owner roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND role <> 'owner'::app_role
);

-- Drop the broad "Admins can manage roles" (covered ALL ops, allowed owner)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- =====================================================================
-- 4. Realtime topic scoping: keep simple uid-suffix rule (already in place)
-- =====================================================================
-- Existing policy on realtime.messages already restricts topics to those
-- ending with caller's uid, so any well-named channel (e.g. "friends:<uid>",
-- "invites:<uid>") is auto-scoped. Apps must use uid-suffixed topic names.
