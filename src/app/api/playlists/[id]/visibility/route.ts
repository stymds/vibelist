import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { visibilitySchema } from "@/lib/validations";
import { getValidAccessToken, updatePlaylistVisibility } from "@/lib/spotify/api";

export async function PATCH(
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

  const body = await request.json();
  const parsed = visibilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { is_public } = parsed.data;
  const admin = createAdminClient();

  // Verify ownership
  const { data: playlist, error: fetchError } = await admin
    .from("playlists")
    .select("spotify_playlist_id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !playlist) {
    return NextResponse.json(
      { error: "Playlist not found" },
      { status: 404 }
    );
  }

  // Update in DB
  await admin
    .from("playlists")
    .update({ is_public })
    .eq("id", id);

  // If already created on Spotify, update there too
  if (playlist.spotify_playlist_id) {
    try {
      const accessToken = await getValidAccessToken(user.id);
      await updatePlaylistVisibility(
        playlist.spotify_playlist_id,
        is_public,
        accessToken
      );
    } catch (err) {
      console.error("Spotify visibility update error:", err);
      // Don't fail the request — DB is updated
    }
  }

  return NextResponse.json({ success: true, is_public });
}
