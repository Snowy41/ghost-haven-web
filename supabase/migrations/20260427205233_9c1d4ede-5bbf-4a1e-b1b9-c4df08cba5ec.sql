
-- Re-enable realtime for tables the friends overlay depends on.
-- postgres_changes broadcasts respect RLS — only rows the subscriber can SELECT are sent.
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;
-- friendships was already in the publication (kept)

-- Profiles intentionally NOT re-added — sensitive cols, no realtime need.
