
-- Add unique constraint on subscriptions.user_id to prevent duplicate subscriptions
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Create scheduled cleanup function for session tokens (expired + revoked)
CREATE OR REPLACE FUNCTION public.scheduled_cleanup()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.session_tokens
  WHERE expires_at < now() - interval '1 hour' OR revoked = true;
  
  DELETE FROM public.download_tokens
  WHERE created_at < now() - interval '5 minutes' OR used = true;
$$;
