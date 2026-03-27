CREATE TABLE public.changelogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  version text,
  published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.changelogs ENABLE ROW LEVEL SECURITY;

-- Anyone can read published changelogs
CREATE POLICY "Anyone can view published changelogs"
  ON public.changelogs FOR SELECT TO public
  USING (published = true);

-- Admins/owners can do everything
CREATE POLICY "Admins can manage changelogs"
  ON public.changelogs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage changelogs"
  ON public.changelogs FOR ALL TO public
  USING (has_role(auth.uid(), 'owner'::app_role));