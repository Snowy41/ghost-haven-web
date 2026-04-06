-- Presence table
CREATE TABLE IF NOT EXISTS public.user_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'offline',
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  server_ip text,
  activity text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view presence"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own presence"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Game invites table
CREATE TABLE IF NOT EXISTS public.game_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  server_ip text,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites"
  ON public.game_invites FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send invites"
  ON public.game_invites FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Receivers can update invites"
  ON public.game_invites FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid());

CREATE POLICY "Users can delete own invites"
  ON public.game_invites FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;