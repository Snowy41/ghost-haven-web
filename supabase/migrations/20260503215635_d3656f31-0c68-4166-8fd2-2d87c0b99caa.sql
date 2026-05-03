-- Add expiration to game invites (default 4 hours)
ALTER TABLE public.game_invites
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours');

CREATE INDEX IF NOT EXISTS idx_game_invites_expires_at ON public.game_invites(expires_at);

-- Rate-limit + de-dup trigger for new game invites
CREATE OR REPLACE FUNCTION public.enforce_game_invite_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recent_count INT;
  _existing_pending INT;
BEGIN
  -- Ensure expiry is set (default handles it, but be safe)
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '4 hours';
  END IF;

  -- Block duplicate pending invite to the same receiver
  SELECT COUNT(*) INTO _existing_pending
  FROM public.game_invites
  WHERE sender_id = NEW.sender_id
    AND receiver_id = NEW.receiver_id
    AND status = 'pending'
    AND expires_at > now();

  IF _existing_pending > 0 THEN
    RAISE EXCEPTION 'You already have a pending invite for this friend' USING ERRCODE = 'check_violation';
  END IF;

  -- Rate limit: max 10 invites per sender per hour
  SELECT COUNT(*) INTO _recent_count
  FROM public.game_invites
  WHERE sender_id = NEW.sender_id
    AND created_at > now() - interval '1 hour';

  IF _recent_count >= 10 THEN
    RAISE EXCEPTION 'Invite rate limit reached. Try again later.' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_game_invite_limits ON public.game_invites;
CREATE TRIGGER trg_enforce_game_invite_limits
BEFORE INSERT ON public.game_invites
FOR EACH ROW EXECUTE FUNCTION public.enforce_game_invite_limits();
