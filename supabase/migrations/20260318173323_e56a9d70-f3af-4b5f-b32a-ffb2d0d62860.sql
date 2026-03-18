
-- Bug reports table
CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view all bug reports
CREATE POLICY "Authenticated users can view bug reports"
  ON public.bug_reports FOR SELECT TO authenticated
  USING (true);

-- Users can create their own bug reports
CREATE POLICY "Users can create own bug reports"
  ON public.bug_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own open bug reports
CREATE POLICY "Users can update own bug reports"
  ON public.bug_reports FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'open');

-- Admins/Owners can manage all bug reports
CREATE POLICY "Admins can manage bug reports"
  ON public.bug_reports FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage bug reports"
  ON public.bug_reports FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Bug report replies table
CREATE TABLE public.bug_report_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_report_replies ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view replies
CREATE POLICY "Authenticated users can view replies"
  ON public.bug_report_replies FOR SELECT TO authenticated
  USING (true);

-- Users can create replies on their own reports
CREATE POLICY "Users can reply to own reports"
  ON public.bug_report_replies FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    is_admin_reply = false AND
    EXISTS (SELECT 1 FROM public.bug_reports WHERE id = report_id AND user_id = auth.uid())
  );

-- Admins can reply to any report
CREATE POLICY "Admins can reply to bug reports"
  ON public.bug_report_replies FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can reply to bug reports"
  ON public.bug_report_replies FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'owner'::app_role));

-- Add discord columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN discord_id TEXT,
  ADD COLUMN discord_username TEXT,
  ADD COLUMN discord_avatar TEXT;

-- Updated_at trigger for bug_reports
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
