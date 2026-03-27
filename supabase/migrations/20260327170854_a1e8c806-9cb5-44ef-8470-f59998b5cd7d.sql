-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule token cleanup every hour
SELECT cron.schedule(
  'cleanup-expired-tokens',
  '0 * * * *',
  $$SELECT public.cleanup_download_tokens(); SELECT public.cleanup_session_tokens();$$
);