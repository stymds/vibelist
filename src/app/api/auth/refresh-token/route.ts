import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/spotify/auth";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: dbUser, error: fetchError } = await admin
    .from("users")
    .select("spotify_refresh_token")
    .eq("id", user.id)
    .single();

  if (fetchError || !dbUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  try {
    const tokens = await refreshAccessToken(dbUser.spotify_refresh_token);
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    await admin
      .from("users")
      .update({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token:
          tokens.refresh_token || dbUser.spotify_refresh_token,
        spotify_token_expires_at: tokenExpiresAt,
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Token refresh error:", err);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
