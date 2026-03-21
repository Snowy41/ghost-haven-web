CREATE TABLE public.session_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  revoked boolean NOT NULL DEFAULT false
);

ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_session_tokens_token ON public.session_tokens (token);
CREATE INDEX idx_session_tokens_user_id ON public.session_tokens (user_id);

CREATE OR REPLACE FUNCTION public.cleanup_session_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.session_tokens
  WHERE expires_at < now() OR revoked = true;
$$;