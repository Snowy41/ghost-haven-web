
-- 1. Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime DROP TABLE public.game_invites;
ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;

-- 2. Tighten realtime topic policy: only allow topics ending with caller's uid
DROP POLICY IF EXISTS "Authenticated can read own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text
);

-- 3. Drop ALL public-bucket SELECT policies on storage.objects for these buckets.
-- Public CDN access works via the bucket's `public = true` flag without any SQL policy.
DROP POLICY IF EXISTS "Read avatars by direct path" ON storage.objects;
DROP POLICY IF EXISTS "Read website-assets by direct path" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Website assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read website-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can list avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can list website-assets" ON storage.objects;
