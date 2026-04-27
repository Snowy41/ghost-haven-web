
-- Rate limit log table (backend-only, no client access)
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_lookup
  ON public.rate_limit_log (identifier, action, created_at DESC);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- No policies = service role only (clients cannot read or write)

-- Atomic check-and-record function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_attempts INT,
  p_window_seconds INT
)
RETURNS TABLE(allowed BOOLEAN, current_count INT, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INT;
  _oldest TIMESTAMPTZ;
  _retry INT := 0;
BEGIN
  SELECT COUNT(*), MIN(created_at)
  INTO _count, _oldest
  FROM public.rate_limit_log
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > now() - (p_window_seconds || ' seconds')::interval;

  IF _count >= p_max_attempts THEN
    _retry := GREATEST(1, p_window_seconds - EXTRACT(EPOCH FROM (now() - _oldest))::INT);
    RETURN QUERY SELECT FALSE, _count, _retry;
    RETURN;
  END IF;

  INSERT INTO public.rate_limit_log (identifier, action) VALUES (p_identifier, p_action);
  RETURN QUERY SELECT TRUE, _count + 1, 0;
END;
$$;

-- Cleanup function (called by cleanup-tokens cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_log WHERE created_at < now() - interval '24 hours';
END;
$$;
