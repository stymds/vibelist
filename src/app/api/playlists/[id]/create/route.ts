import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getValidAccessToken,
  createSpotifyPlaylist,
  addTracksToPlaylist,
} from "@/lib/spotify/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify playlist ownership and status
  const { data: playlist, error: fetchError } = await admin
    .from("playlists")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !playlist) {
    return NextResponse.json(
      { error: "Playlist not found" },
      { status: 404 }
    );
  }

  if (playlist.status !== "song_list") {
    return NextResponse.json(
      { error: "Playlist is not in the correct state for creation" },
      { status: 400 }
    );
  }

  try {
    // Get the is_public preference from request body (optional)
    let isPublic = playlist.is_public;
    try {
      const body = await request.json();
      if (typeof body.is_public === "boolean") {
        isPublic = body.is_public;
      }
    } catch {
      // No body or invalid JSON — use playlist default
    }

    const accessToken = await getValidAccessToken(user.id);

    // Create playlist on Spotify
    const spotifyPlaylist = await createSpotifyPlaylist(
      playlist.name,
      isPublic,
      accessToken
    );

    // Add tracks (filter out any missing IDs)
    const trackIds = (playlist.tracks as Array<{ spotify_track_id: string }>)
      .map((t) => t.spotify_track_id)
      .filter(Boolean);

    if (trackIds.length > 0) {
      await addTracksToPlaylist(spotifyPlaylist.id, trackIds, accessToken);
    }

    // Update playlist in DB
    await admin
      .from("playlists")
      .update({
        spotify_playlist_id: spotifyPlaylist.id,
        spotify_playlist_url: spotifyPlaylist.url,
        is_public: isPublic,
        status: "created",
      })
      .eq("id", id);

    return NextResponse.json({
      spotify_playlist_id: spotifyPlaylist.id,
      spotify_playlist_url: spotifyPlaylist.url,
    });
  } catch (err) {
    console.error("Create playlist error:", err);
    return NextResponse.json(
      { error: "Failed to create playlist on Spotify" },
      { status: 500 }
    );
  }
}
