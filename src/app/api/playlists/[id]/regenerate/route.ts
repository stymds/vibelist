import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePlaylist } from "@/lib/openai/prompts";
import { searchTracksInBatches, validateSpotifyAccess, SpotifyAccessError } from "@/lib/spotify/api";
import { regenerateSchema } from "@/lib/validations";
import { CREDITS } from "@/lib/constants";

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

  // Verify playlist ownership
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

  // Parse request body
  const body = await request.json();
  const parsed = regenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { exclude_tracks } = parsed.data;
  const wasFree = !playlist.regeneration_used;
  const creditCost = wasFree
    ? 0
    : playlist.input_type === "text"
      ? CREDITS.TEXT_COST
      : CREDITS.IMAGE_COST;

  // Check credits if regeneration costs
  if (creditCost > 0) {
    const { data: userData } = await admin
      .from("users")
      .select("credits_remaining")
      .eq("id", user.id)
      .single();

    if (!userData || userData.credits_remaining < creditCost) {
      return NextResponse.json(
        { error: "Not enough credits" },
        { status: 403 }
      );
    }
  }

  try {
    // Validate Spotify access before any costly operations
    const accessToken = await validateSpotifyAccess(user.id);

    // Parse stored image URLs (JSONB array or null)
    const imageUrls: string[] = Array.isArray(playlist.input_image_urls)
      ? playlist.input_image_urls
      : [];

    // Generate new songs using unified function
    const aiResult = await generatePlaylist(
      playlist.input_text,
      imageUrls,
      playlist.track_count,
      exclude_tracks
    );

    // Search Spotify (batched for performance)
    const foundTracks = await searchTracksInBatches(
      aiResult.songs,
      playlist.track_count,
      accessToken
    );

    // Deduct credits if not free
    let newBalance = 0;
    if (creditCost > 0) {
      const { data } = await admin.rpc("deduct_credits", {
        p_user_id: user.id,
        p_cost: creditCost,
      });

      if (data === -1) {
        return NextResponse.json(
          { error: "Not enough credits" },
          { status: 403 }
        );
      }
      newBalance = data;
    } else {
      const { data: userData } = await admin
        .from("users")
        .select("credits_remaining")
        .eq("id", user.id)
        .single();
      newBalance = userData?.credits_remaining ?? 0;
    }

    // Update playlist
    await admin
      .from("playlists")
      .update({
        name: aiResult.playlist_name,
        tracks: foundTracks,
        track_count: foundTracks.length,
        regeneration_used: true,
      })
      .eq("id", id);

    return NextResponse.json({
      playlist_id: id,
      playlist_name: aiResult.playlist_name,
      tracks: foundTracks,
      credits_remaining: newBalance,
      was_free: wasFree,
    });
  } catch (err) {
    if (err instanceof SpotifyAccessError) {
      return NextResponse.json(
        { error: err.message, error_type: "spotify_access_revoked" },
        { status: err.statusCode }
      );
    }
    console.error("Regenerate error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
