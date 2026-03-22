
-- Add 'beta' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'beta';

-- Insert default beta_duration setting (days) if not exists
INSERT INTO public.site_settings (key, value) VALUES ('beta_duration_days', '{"days": 30}')
ON CONFLICT (key) DO NOTHING;
