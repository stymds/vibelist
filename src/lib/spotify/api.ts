import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/spotify/auth";
import type { TrackInfo } from "@/types/database";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export class SpotifyAccessError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = "SpotifyAccessError";
    this.statusCode = statusCode;
  }
}

export async function validateSpotifyAccess(userId: string): Promise<string> {
  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(userId);
  } catch {
    throw new SpotifyAccessError(
      "Your Spotify access has been revoked. Please contact the developer for access.",
      403
    );
  }

  // Ping /v1/me to verify the token actually works
  const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401 || response.status === 403) {
    throw new SpotifyAccessError(
      "Your Spotify access has been revoked. Please contact the developer for access.",
      response.status
    );
  }

  if (!response.ok) {
    throw new SpotifyAccessError(
      "Failed to verify Spotify access. Please try again.",
      response.status
    );
  }

  return accessToken;
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: user, error } = await admin
    .from("users")
    .select(
      "spotify_access_token, spotify_refresh_token, spotify_token_expires_at"
    )
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new Error("User not found");
  }

  const expiresAt = new Date(user.spotify_token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5-minute buffer

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return user.spotify_access_token;
  }

  // Token expired or about to expire — refresh
  const tokens = await refreshAccessToken(user.spotify_refresh_token);
  const newExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  await admin
    .from("users")
    .update({
      spotify_access_token: tokens.access_token,
      spotify_refresh_token: tokens.refresh_token || user.spotify_refresh_token,
      spotify_token_expires_at: newExpiresAt,
    })
    .eq("id", userId);

  return tokens.access_token;
}

async function spotifyFetch(
  url: string,
  accessToken: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return spotifyFetch(url, accessToken, options);
  }

  return response;
}

export async function searchTrack(
  title: string,
  artist: string,
  accessToken: string
): Promise<TrackInfo | null> {
  // Tier 1: exact search "track:title artist:artist"
  const exactQuery = encodeURIComponent(
    `track:${title} artist:${artist}`
  );
  let response = await spotifyFetch(
    `${SPOTIFY_API_BASE}/search?q=${exactQuery}&type=track&limit=1`,
    accessToken
  );
  if (!response.ok) return null;
  let data = await response.json();

  if (data.tracks?.items?.length > 0) {
    const track = data.tracks.items[0];
    return {
      title: track.name,
      artist: track.artists[0]?.name || artist,
      spotify_track_id: track.id,
    };
  }

  // Tier 2: loose search "title artist"
  const looseQuery = encodeURIComponent(`${title} ${artist}`);
  response = await spotifyFetch(
    `${SPOTIFY_API_BASE}/search?q=${looseQuery}&type=track&limit=1`,
    accessToken
  );
  if (!response.ok) return null;
  data = await response.json();

  if (data.tracks?.items?.length > 0) {
    const track = data.tracks.items[0];
    return {
      title: track.name,
      artist: track.artists[0]?.name || artist,
      spotify_track_id: track.id,
    };
  }

  // Tier 3: title-only search
  const titleQuery = encodeURIComponent(title);
  response = await spotifyFetch(
    `${SPOTIFY_API_BASE}/search?q=${titleQuery}&type=track&limit=1`,
    accessToken
  );
  if (!response.ok) return null;
  data = await response.json();

  if (data.tracks?.items?.length > 0) {
    const track = data.tracks.items[0];
    return {
      title: track.name,
      artist: track.artists[0]?.name || artist,
      spotify_track_id: track.id,
    };
  }

  return null;
}

export async function createSpotifyPlaylist(
  name: string,
  isPublic: boolean,
  accessToken: string
): Promise<{ id: string; url: string }> {
  const response = await spotifyFetch(
    `${SPOTIFY_API_BASE}/me/playlists`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        description: "Created with VibeList AI. VibeList AI is a SaaS web app where users log in with Spotify, describe a vibe via text or image, and get an AI-curated playlist saved directly to their Spotify. The AI interprets mood, scene, emotions, and activity to select perfectly matching tracks.",
        public: isPublic,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create playlist: ${error}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    url: data.external_urls?.spotify || `https://open.spotify.com/playlist/${data.id}`,
  };
}

export async function addTracksToPlaylist(
  playlistId: string,
  trackIds: string[],
  accessToken: string
): Promise<void> {
  const uris = trackIds.map((id) => `spotify:track:${id}`);

  // Spotify allows max 100 tracks per request
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const response = await spotifyFetch(
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/items`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ uris: batch }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to add tracks (${response.status}): ${error}`
      );
    }
  }
}

export async function updatePlaylistVisibility(
  playlistId: string,
  isPublic: boolean,
  accessToken: string
): Promise<void> {
  const response = await spotifyFetch(
    `${SPOTIFY_API_BASE}/playlists/${playlistId}`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify({ public: isPublic }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update playlist visibility: ${error}`);
  }
}
