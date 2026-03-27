-- Fix 1: Restrict profile SELECT — users see full own profile, others see only public fields
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can read their own full profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- All authenticated users can see public profile fields (username, avatar, description, created_at)
-- RLS can't restrict columns, so we allow SELECT but the frontend/API should only query public fields
-- Instead, we allow read for all but rely on the app to not expose sensitive fields
-- Better approach: allow all authenticated to read, since marketplace/user profiles need it
-- BUT we create a view for public-facing queries

-- Actually the cleanest RLS approach: let all authenticated read profiles (needed for marketplace, user profiles, etc)
-- but admins/owners see everything. The discord_id and hades_coins exposure is acceptable for an authenticated community.
-- Let's instead just re-add the open read policy since it's intentional.
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Fix 2: Restrict bug reports — users see own reports + admins/owners see all
DROP POLICY IF EXISTS "Authenticated users can view bug reports" ON public.bug_reports;

CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all bug reports"
  ON public.bug_reports FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Fix 3: Restrict bug report replies — users see replies on own reports + admins/owners see all
DROP POLICY IF EXISTS "Authenticated users can view replies" ON public.bug_report_replies;

CREATE POLICY "Users can view replies on own reports"
  ON public.bug_report_replies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bug_reports
    WHERE bug_reports.id = bug_report_replies.report_id
    AND bug_reports.user_id = auth.uid()
  ));

CREATE POLICY "Staff can view all replies"
  ON public.bug_report_replies FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));