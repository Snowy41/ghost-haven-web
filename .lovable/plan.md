## 1. Fix Discord Linking for All Users
**Problem**: Both `DiscordLinkPrompt.tsx` and `DiscordLink.tsx` redirect the browser directly to the edge function URL, but the edge function requires a JWT `Authorization` header. Browser redirects can't send headers → linking fails for everyone.

**Fix**: Change the client components to call the edge function via `fetch` with the auth token, then redirect the browser to the Discord OAuth URL returned (302 Location).

## 2. Add Presence / Heartbeat System
**Database**: Create a `user_presence` table:
- `user_id` (uuid, unique)
- `status` — `website` | `launcher` | `client`
- `last_seen` (timestamp)
- `server_ip` (text, nullable — for in-game)
- `activity` (text, nullable — description of what they're doing)
- `updated_at`

**Backend**: 
- Add `heartbeat` action to `launcher-friends` edge function (accepts status, server_ip, activity)
- The website sets presence via a new small edge function or direct DB update

**Frontend**: 
- Show green/yellow/gray dots on friend rows based on last_seen recency
- Show status tooltip (Website / Launcher / Playing on server X)
- Website sends periodic heartbeat while user is active

## 3. Invite-to-Play Endpoint
- Add `invite` action to `launcher-friends` — creates an invite record or sends via realtime
- Add `invites` action to list pending invites
- Frontend: Add "Invite to play" button on friend rows (when friend is online)

## 4. Realtime Messaging Enhancement
- Enable Supabase Realtime on the `messages` table (ALTER PUBLICATION)
- The FriendsOverlay already subscribes to realtime INSERT events — verify it works end-to-end
