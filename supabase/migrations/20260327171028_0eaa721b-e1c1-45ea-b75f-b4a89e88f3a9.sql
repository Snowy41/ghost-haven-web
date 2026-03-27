-- Fix 1: session_tokens - add RLS policies (only service role uses this, but add safety)
CREATE POLICY "No direct access to session tokens"
  ON public.session_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Fix 2: download_tokens - add RLS policies
CREATE POLICY "No direct access to download tokens"
  ON public.download_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Fix 3: Prevent privilege escalation - restrict INSERT on user_roles to admins/owners only
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only owners can insert roles"
  ON public.user_roles FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Restrict DELETE on user_roles to admins/owners
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can delete roles"
  ON public.user_roles FOR DELETE TO public
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Restrict UPDATE on user_roles to admins/owners
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can update roles"
  ON public.user_roles FOR UPDATE TO public
  USING (has_role(auth.uid(), 'owner'::app_role));