

## Plan: Fix Endpoints, Secure JAR Delivery, Preview Images, Large-File Downloads

### Issues Found

1. **`launcher-download` (DLL)** — Missing admin/owner bypass. Only checks subscription, so staff get 403.
2. **`launcher-beta-download`** — Returns JSON `{ url }` but the Download page expects a Blob. This causes the "Download failed" error on the website.
3. **No JAR download endpoint for the DLL/client** — Need a token-handshake endpoint so the injected DLL can securely fetch the JAR.
4. **No admin preview image management** — Homepage hero and download page have hardcoded placeholders.
5. **`launcher-config-download`** — Still streams raw bytes (will fail for large configs too). Should use signed URLs.

---

### Step 1: Fix `launcher-download` (DLL endpoint)

Add the same admin/owner role check that `launcher-jar-download` already has. Check roles via service role client, skip subscription check if staff.

**File**: `supabase/functions/launcher-download/index.ts`

---

### Step 2: Fix Download page beta button

The `launcher-beta-download` endpoint now returns `{ url: "..." }` JSON, but `Download.tsx` checks for `data instanceof Blob`. Update the handler to parse the JSON response, extract the signed URL, and redirect/download via that URL. Same pattern for any future website-side download buttons.

**File**: `src/pages/Download.tsx`

---

### Step 3: Create `launcher-jar-fetch` — Token Handshake Endpoint

A two-step secure JAR delivery for the DLL:

- **Step 1 — Token request** (`POST` with `{ action: "request_token" }`): Validates the user's bearer token, checks subscription/staff, generates a one-time download token (random UUID), stores it in a short-lived map (or a `download_tokens` DB table with 60-second TTL), returns `{ token }`.
- **Step 2 — Download** (`POST` with `{ action: "download", token: "..." }`): Validates the one-time token, deletes it, returns a signed URL for `client/hades.jar`.

This makes it harder to leak — tokens are single-use, short-lived, and tied to a user session. The DLL can embed a client secret that gets validated alongside the token for additional anti-crack protection.

**Files**:
- `supabase/functions/launcher-jar-fetch/index.ts` (new)
- `supabase/config.toml` (add function config)
- Database migration: create `download_tokens` table (id, user_id, token, created_at, used boolean) with auto-cleanup

---

### Step 4: Preview Image Upload in Admin Panel

- Add a new storage path pattern: `preview/hero.png`, `preview/showcase-1.png`, `preview/showcase-2.png` etc. in the existing `configs` bucket (or create a dedicated `website-assets` public bucket).
- Add a "Website Media" section to `DashboardFiles.tsx` (or a new `DashboardMedia.tsx` tab) with upload slots for:
  - Hero preview image
  - Download page showcase image 1
  - Download page showcase image 2
- Store the URLs in `site_settings` table (key: `preview_images`, value: JSON with URLs).
- Update `HeroSection.tsx` to fetch from `site_settings` and show the uploaded image instead of the placeholder.
- Update `Download.tsx` showcase section similarly.

**Files**:
- Database migration: create public `website-assets` storage bucket + RLS (admins can upload, public can read)
- `src/components/dashboard/DashboardMedia.tsx` (new)
- `src/pages/Dashboard.tsx` (add Media tab)
- `src/components/home/HeroSection.tsx` (fetch and display)
- `src/pages/Download.tsx` (fetch and display in showcase)

---

### Step 5: Fix `launcher-config-download` for large files

Change from streaming raw bytes to returning a signed URL (same pattern as the other download endpoints).

**File**: `supabase/functions/launcher-config-download/index.ts`

---

### Summary of Changes

| Area | What | Files |
|---|---|---|
| DLL download | Add admin bypass | `launcher-download/index.ts` |
| Beta download (website) | Handle JSON `{ url }` response | `Download.tsx` |
| JAR fetch (DLL) | New token-handshake endpoint | `launcher-jar-fetch/index.ts`, migration, `config.toml` |
| Config download | Switch to signed URLs | `launcher-config-download/index.ts` |
| Preview images | Admin upload + display | New bucket, `DashboardMedia.tsx`, `HeroSection.tsx`, `Download.tsx`, `Dashboard.tsx` |

### Technical Details

- **Download tokens table**: `id uuid PK, user_id uuid, token text unique, created_at timestamptz default now(), used boolean default false`. RLS: no public access (only service role uses it). A DB function or the edge function itself cleans up tokens older than 60 seconds.
- **Website-assets bucket**: Public bucket for read access, admin-only write via RLS policy checking `has_role(auth.uid(), 'admin')` or `has_role(auth.uid(), 'owner')`.
- **Anti-leak in DLL**: The DLL should embed a hardcoded secret string (e.g. `X-Client-Key` header) that the `launcher-jar-fetch` endpoint validates. This means even if someone extracts the token flow, they can't use it without the compiled DLL's embedded secret.

