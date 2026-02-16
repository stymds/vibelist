<![CDATA[<div align="center">
  <img src="public/logo/logo.png" alt="VibeList Logo" width="80" />
  <h1>VibeList</h1>
  <p><strong>Describe a vibe. Get a Spotify playlist.</strong></p>

  <p>
    <a href="https://vibelist.satyamdas.site">Live App</a> ·
    <a href="https://satyamdas.site">Portfolio</a> ·
    <a href="#getting-started">Getting Started</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai" alt="OpenAI" />
  </p>
</div>

---

## Overview

VibeList is a full-stack SaaS web application that turns any vibe — a mood, a memory, a scene, an image — into a real Spotify playlist saved directly to your account. Users log in with Spotify, describe their vibe through text or by uploading images, and an AI model interprets the emotional tone, energy level, and atmosphere to curate a matching set of tracks. The playlist is then searched on Spotify in real-time and pushed straight into the user's library.

Built as a portfolio project to demonstrate production-grade full-stack engineering: custom OAuth flows, AI integration, atomic database operations, rate limiting, and a polished responsive UI.

---

## Features

- **Spotify OAuth login** — full manual OAuth 2.0 implementation with PKCE-like state verification, no third-party auth wrappers
- **Text-to-playlist** — describe any vibe in 10–500 characters; AI generates a curated track list
- **Image-to-playlist** — upload up to 3 images (JPEG/PNG/WebP, max 10MB each); GPT-4o analyzes the visual mood and atmosphere
- **Multi-modal input** — combine text and images together for even more precise vibe matching
- **Direct Spotify integration** — playlists are created and populated in the user's actual Spotify account
- **Free regeneration** — every playlist gets one free regenerate; AI avoids previously suggested tracks
- **Credit system** — text costs 1 credit, image costs 2; new users receive 5 free credits
- **Public / private toggle** — change playlist visibility on Spotify at any time from the app
- **Rate limiting** — 5 requests per 60-second sliding window per user via Upstash Redis
- **Mobile-first responsive UI** — sidebar navigation on desktop, bottom tab bar on mobile

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components) |
| Language | TypeScript 5 (strict mode) |
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Radix UI |
| AI | OpenAI GPT-4o (`gpt-4o` with JSON mode) |
| Database | [Supabase](https://supabase.com) PostgreSQL with Row Level Security |
| Auth | Manual Spotify OAuth 2.0 + Supabase Auth session |
| Storage | Supabase Storage (vibe images) |
| Rate Limiting | [Upstash](https://upstash.com) Redis (sliding window) |
| Validation | Zod |
| State / Fetching | TanStack Query v5 |
| Icons | Lucide React |
| Toasts | Sonner |
| Deployment | Vercel (frontend) + Supabase (backend) |

---

## Architecture

### Authentication Flow

VibeList uses a fully custom Spotify OAuth 2.0 flow rather than delegating to Supabase's built-in provider. This gives complete control over token storage and refresh logic.

1. User clicks "Login with Spotify"
2. Server generates a random CSRF state, stores it in an `httpOnly` cookie
3. User is redirected to Spotify's authorization page
4. On callback, state is verified, authorization code is exchanged for tokens
5. Spotify profile is fetched and a Supabase Auth user is created (or updated) with a deterministic HMAC-SHA256 password derived from the Spotify ID and the service role key
6. Supabase session cookie is set — RLS policies take effect from this point forward
7. Spotify tokens are stored in the `users` table and refreshed automatically (with a 5-minute buffer) on every request

### Playlist Generation Flow

```
User Input (text / images)
        │
        ▼
Validate input + check credits
        │
        ▼
Validate Spotify token (refresh if needed)
        │
        ▼
GPT-4o: generate N×2 candidate songs as JSON
        │
        ▼
Spotify Search API (batched, 5 parallel at a time)
  ├─ Tier 1: exact "track:{title} artist:{artist}" query
  ├─ Tier 2: loose "{title} {artist}" query
  └─ Tier 3: title-only fallback
        │
        ▼
Deduplicate + no consecutive same-artist rule
        │
        ▼
Atomic credit deduction via Supabase RPC
        │
        ▼
Playlist record saved to database
        │
        ▼
User can: Create on Spotify / Regenerate / Toggle visibility
```

### Database Schema

```sql
users
  id                       UUID  PK (references auth.users)
  spotify_id               TEXT  UNIQUE
  email                    TEXT
  display_name             TEXT
  avatar_url               TEXT
  spotify_access_token     TEXT
  spotify_refresh_token    TEXT
  spotify_token_expires_at TIMESTAMPTZ
  credits_remaining        INT   DEFAULT 5
  created_at / updated_at  TIMESTAMPTZ

playlists
  id                    UUID  PK
  user_id               UUID  FK → users
  spotify_playlist_id   TEXT
  spotify_playlist_url  TEXT
  name                  TEXT
  input_type            ENUM  ('text' | 'image')
  input_text            TEXT
  input_image_urls      JSONB
  track_count           INT
  tracks                JSONB  -- Array of { title, artist, spotify_track_id }
  is_public             BOOLEAN
  regeneration_used     BOOLEAN
  credits_charged       INT
  status                ENUM  ('generating' | 'song_list' | 'created' | 'failed')
  created_at            TIMESTAMPTZ
```

Row Level Security is enabled on both tables. All server-side mutations use the admin client (bypasses RLS); all client-facing reads go through the user's session (RLS enforced).

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/            # Initiates Spotify OAuth redirect
│   │   │   ├── callback/spotify/ # Handles OAuth callback
│   │   │   └── refresh-token/    # Background token refresh
│   │   ├── playlists/
│   │   │   ├── generate/         # POST: AI generation + Spotify search
│   │   │   └── [id]/
│   │   │       ├── create/       # POST: push playlist to Spotify
│   │   │       ├── regenerate/   # POST: AI regeneration with exclusions
│   │   │       └── visibility/   # PATCH: toggle public/private
│   │   └── user/
│   │       └── credits/          # GET: current credit balance
│   ├── (app)/                    # Authenticated app layout
│   └── login/                    # Login page
├── components/                   # Shared UI components
├── hooks/                        # useUser, useCredits (TanStack Query)
├── lib/
│   ├── supabase/                 # client.ts, server.ts, admin.ts
│   ├── spotify/                  # auth.ts, api.ts
│   ├── openai/                   # client.ts, prompts.ts
│   ├── constants.ts
│   ├── rate-limit.ts
│   └── validations.ts            # Zod schemas
├── types/
│   ├── database.ts
│   └── playlist.ts
└── actions/
    └── auth.ts                   # signOut server action
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key
- An [Upstash](https://upstash.com) Redis database

### 1. Clone and install

```bash
git clone https://github.com/your-username/vibelist.git
cd vibelist
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Spotify
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify

# OpenAI
OPENAI_API_KEY=sk-...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up the database

Run the full contents of `supabase-migration.sql` in the **Supabase SQL Editor**. This creates:
- `users` and `playlists` tables
- All RLS policies
- The `deduct_credits` atomic RPC function
- The `update_updated_at_column` trigger

### 4. Create the storage bucket

In Supabase → Storage → create a new bucket:
- **Name:** `vibe-images`
- **Public:** yes
- **Max file size:** 10MB

### 5. Configure Spotify redirect URI

In your Spotify Developer Dashboard, add to **Redirect URIs**:
```
http://localhost:3000/api/auth/callback/spotify
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/auth/login` | Initiates Spotify OAuth flow | — |
| `GET` | `/api/auth/callback/spotify` | OAuth callback handler | — |
| `GET` | `/api/auth/refresh-token` | Refreshes Spotify access token | Session |
| `POST` | `/api/playlists/generate` | Generate AI playlist from vibe | Session |
| `POST` | `/api/playlists/[id]/regenerate` | Regenerate with exclusions | Session |
| `POST` | `/api/playlists/[id]/create` | Push playlist to Spotify account | Session |
| `PATCH` | `/api/playlists/[id]/visibility` | Toggle public/private | Session |
| `GET` | `/api/user/credits` | Get current credit balance | Session |

**Rate limit:** 5 requests per 60 seconds per user (sliding window) on generation endpoints.

---

## Deployment

The app is deployed on **Vercel** with the backend on **Supabase**.

1. Push to GitHub and import into Vercel
2. Add all environment variables in Vercel project settings
3. Update `NEXT_PUBLIC_APP_URL` and `SPOTIFY_REDIRECT_URI` to your production domain
4. Add the production redirect URI to your Spotify Developer Dashboard

---

## Design Decisions

**Why manual Spotify OAuth instead of Supabase's built-in provider?**
Supabase's OAuth provider doesn't expose Spotify's `refresh_token` for storing and using later. Since VibeList needs to call the Spotify API on behalf of users (to create playlists) — not just authenticate them — full token ownership is required.

**Why a deterministic password for Supabase Auth?**
Supabase Auth is used solely to establish a session so RLS policies work. Since users never set a password (Spotify is the only login method), an HMAC-SHA256 hash of the Spotify ID is generated server-side as a stable, reproducible credential.

**Why `Promise.allSettled` for track searches?**
Individual Spotify search failures (429, network error) shouldn't abort the entire playlist. Batches of 5 are fired in parallel; fulfilled results are collected, rejected ones are silently skipped. This is both faster and more resilient than sequential iteration.

**Why Upstash Redis for rate limiting?**
Vercel's serverless/edge functions are stateless. An in-memory rate limiter would reset on every cold start. Upstash provides a persistent, low-latency Redis instance that works correctly across all function instances.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Built by <a href="https://satyamdas.site">Satyam Das</a>
</div>
]]>