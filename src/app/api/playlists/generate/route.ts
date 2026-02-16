import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePlaylist } from "@/lib/openai/prompts";
import { searchTracksInBatches, validateSpotifyAccess, SpotifyAccessError } from "@/lib/spotify/api";
import { getRatelimit } from "@/lib/rate-limit";
import { CREDITS, INPUT_LIMITS, SONG_COUNT } from "@/lib/constants";

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rl = getRatelimit();
  const { success } = await rl.limit(user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const trackCount = parseInt(formData.get("track_count") as string, 10);

    // Validate track count
    if (
      isNaN(trackCount) ||
      trackCount < SONG_COUNT.MIN ||
      trackCount > SONG_COUNT.MAX
    ) {
      return NextResponse.json(
        { error: "Invalid track count" },
        { status: 400 }
      );
    }

    // Extract text and images
    const inputText = (formData.get("input_text") as string | null)?.trim() || null;
    const imageFiles = formData.getAll("image") as File[];

    // Determine input type based on presence of images
    const inputType = imageFiles.length > 0 ? "image" : "text";

    // Validate: must have text or images
    if (!inputText && imageFiles.length === 0) {
      return NextResponse.json(
        { error: "Please provide text or at least one image" },
        { status: 400 }
      );
    }

    // Validate text if provided (only enforce length for text-only)
    if (inputType === "text" && inputText) {
      if (
        inputText.length < INPUT_LIMITS.TEXT_MIN_LENGTH ||
        inputText.length > INPUT_LIMITS.TEXT_MAX_LENGTH
      ) {
        return NextResponse.json(
          { error: "Invalid text input" },
          { status: 400 }
        );
      }
    }

    // Validate images
    if (imageFiles.length > INPUT_LIMITS.MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${INPUT_LIMITS.MAX_IMAGES} images allowed` },
        { status: 400 }
      );
    }

    for (const imageFile of imageFiles) {
      if (imageFile.size > INPUT_LIMITS.IMAGE_MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Image too large" },
          { status: 400 }
        );
      }
      if (!INPUT_LIMITS.ACCEPTED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { error: "Invalid image type" },
          { status: 400 }
        );
      }
    }

    const creditCost =
      inputType === "text" ? CREDITS.TEXT_COST : CREDITS.IMAGE_COST;

    // Check credits (via admin to bypass RLS for atomic deduction)
    const admin = createAdminClient();
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

    // Validate Spotify access before any costly operations
    const accessToken = await validateSpotifyAccess(user.id);

    // Upload images to Supabase Storage
    const inputImageUrls: string[] = [];
    for (const imageFile of imageFiles) {
      const fileName = `${user.id}/${Date.now()}-${imageFile.name}`;
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data: uploadData, error: uploadError } = await admin.storage
        .from("vibe-images")
        .upload(fileName, buffer, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = admin.storage.from("vibe-images").getPublicUrl(uploadData.path);

      inputImageUrls.push(publicUrl);
    }

    // Create playlist record with status 'generating'
    const { data: playlist, error: insertError } = await admin
      .from("playlists")
      .insert({
        user_id: user.id,
        name: "Generating...",
        input_type: inputType,
        input_text: inputText,
        input_image_urls: inputImageUrls.length > 0 ? inputImageUrls : null,
        track_count: trackCount,
        tracks: [],
        credits_charged: creditCost,
        status: "generating",
      })
      .select("id")
      .single();

    if (insertError || !playlist) {
      console.error("Playlist insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create playlist record" },
        { status: 500 }
      );
    }

    // Generate songs with AI
    let aiResult;
    try {
      aiResult = await generatePlaylist(
        inputText,
        inputImageUrls,
        trackCount
      );
    } catch (aiError) {
      console.error("AI generation error:", aiError);
      await admin
        .from("playlists")
        .update({ status: "failed" })
        .eq("id", playlist.id);
      return NextResponse.json(
        { error: "Failed to analyze your vibe. Please try again." },
        { status: 500 }
      );
    }

    // Search Spotify for each candidate (batched for performance)
    const foundTracks = await searchTracksInBatches(
      aiResult.songs,
      trackCount,
      accessToken
    );

    // Deduct credits atomically
    const { data: newBalance } = await admin.rpc("deduct_credits", {
      p_user_id: user.id,
      p_cost: creditCost,
    });

    if (newBalance === -1) {
      await admin
        .from("playlists")
        .update({ status: "failed" })
        .eq("id", playlist.id);
      return NextResponse.json(
        { error: "Not enough credits" },
        { status: 403 }
      );
    }

    // Update playlist with results
    await admin
      .from("playlists")
      .update({
        name: aiResult.playlist_name,
        tracks: foundTracks,
        track_count: foundTracks.length,
        status: "song_list",
      })
      .eq("id", playlist.id);

    return NextResponse.json({
      playlist_id: playlist.id,
      playlist_name: aiResult.playlist_name,
      tracks: foundTracks,
      credits_remaining: newBalance,
    });
  } catch (err) {
    if (err instanceof SpotifyAccessError) {
      return NextResponse.json(
        { error: err.message, error_type: "spotify_access_revoked" },
        { status: err.statusCode }
      );
    }
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
