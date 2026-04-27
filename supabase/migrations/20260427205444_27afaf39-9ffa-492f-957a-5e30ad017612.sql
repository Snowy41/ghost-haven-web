
-- Drop dependent view first
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- Create private companion table
CREATE TABLE public.profiles_private (
  user_id uuid PRIMARY KEY,
  hwid text,
  discord_id text,
  discord_avatar text,
  banned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill from existing profiles
INSERT INTO public.profiles_private (user_id, hwid, discord_id, discord_avatar, banned_at)
SELECT user_id, hwid, discord_id, discord_avatar, banned_at
FROM public.profiles
WHERE hwid IS NOT NULL OR discord_id IS NOT NULL OR discord_avatar IS NOT NULL OR banned_at IS NOT NULL;

-- Drop sensitive columns from public profiles
ALTER TABLE public.profiles DROP COLUMN hwid;
ALTER TABLE public.profiles DROP COLUMN discord_id;
ALTER TABLE public.profiles DROP COLUMN discord_avatar;
ALTER TABLE public.profiles DROP COLUMN banned_at;

-- Restore broad SELECT on profiles (now safe — no sensitive fields)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop staff-only policy (broad SELECT covers it now)
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Enable RLS + policies on private table
ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private data"
ON public.profiles_private FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Staff can view all private data"
ON public.profiles_private FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Users can update own private data"
ON public.profiles_private FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own private data"
ON public.profiles_private FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can manage private data"
ON public.profiles_private FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_profiles_private_updated_at
BEFORE UPDATE ON public.profiles_private
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create private row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Player'));

  INSERT INTO public.profiles_private (user_id)
  VALUES (NEW.id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;
