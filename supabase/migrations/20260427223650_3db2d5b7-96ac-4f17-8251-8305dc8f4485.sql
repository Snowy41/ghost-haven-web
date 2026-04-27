
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_log() FROM PUBLIC, anon, authenticated;
