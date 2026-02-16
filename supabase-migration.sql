-- VibeList Phase 1 Database Migration
-- Run this in Supabase SQL Editor

BEGIN;

-- Create custom enums
CREATE TYPE input_type_enum AS ENUM ('text', 'image');
CREATE TYPE playlist_status_enum AS ENUM ('generating', 'song_list', 'created', 'failed');

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  spotify_access_token TEXT NOT NULL,
  spotify_refresh_token TEXT NOT NULL,
  spotify_token_expires_at TIMESTAMPTZ NOT NULL,
  credits_remaining INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create playlists table
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spotify_playlist_id TEXT,
  spotify_playlist_url TEXT,
  name TEXT NOT NULL,
  input_type input_type_enum NOT NULL,
  input_text TEXT,
  input_image_url TEXT,
  track_count INT NOT NULL,
  tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  regeneration_used BOOLEAN NOT NULL DEFAULT false,
  credits_charged INT NOT NULL,
  status playlist_status_enum NOT NULL DEFAULT 'generating',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on playlists.user_id for faster lookups
CREATE INDEX idx_playlists_user_id ON playlists(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for playlists table
CREATE POLICY "Users can view own playlists"
  ON playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlists"
  ON playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Atomic credit deduction RPC
-- Returns the new credit balance, or -1 if insufficient credits
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_cost INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INT;
BEGIN
  UPDATE users
  SET credits_remaining = credits_remaining - p_cost
  WHERE id = p_user_id
    AND credits_remaining >= p_cost
  RETURNING credits_remaining INTO new_balance;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN new_balance;
END;
$$;

-- ============================================================
-- Multi-image support migration (run after initial setup)
-- Convert single URL column to JSONB array
-- ============================================================

-- Add new JSONB array column
ALTER TABLE playlists
  ADD COLUMN IF NOT EXISTS input_image_urls JSONB DEFAULT NULL;

-- Migrate existing single-image data to array format
UPDATE playlists
  SET input_image_urls = jsonb_build_array(input_image_url)
  WHERE input_image_url IS NOT NULL
    AND input_image_urls IS NULL;

-- Drop old column (only run after verifying migration)
ALTER TABLE playlists DROP COLUMN IF EXISTS input_image_url;

COMMIT;
