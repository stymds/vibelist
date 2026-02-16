import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import {
  exchangeCodeForTokens,
  fetchSpotifyProfile,
  generateDeterministicPassword,
} from "@/lib/spotify/auth";
import { CREDITS, ROUTES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error) {
    return NextResponse.redirect(
      `${appUrl}${ROUTES.LOGIN}?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}${ROUTES.LOGIN}?error=missing_params`
    );
  }

  // Verify state — read directly from request cookies (reliable in route handlers)
  const storedState = request.cookies.get("spotify_oauth_state")?.value;

  if (state !== storedState) {
    console.error("[OAuth] state_mismatch — state:", state, "storedState:", storedState);
    return NextResponse.redirect(
      `${appUrl}${ROUTES.LOGIN}?error=state_mismatch`
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch Spotify profile
    const profile = await fetchSpotifyProfile(tokens.access_token);

    const admin = createAdminClient();
    const password = generateDeterministicPassword(profile.id);
    const email = profile.email || `${profile.id}@spotify.vibelist.local`;
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();
    const avatarUrl =
      profile.images && profile.images.length > 0
        ? profile.images[profile.images.length - 1].url
        : null;

    // Check if user already exists in our users table
    const { data: existingUser } = await admin
      .from("users")
      .select("id")
      .eq("spotify_id", profile.id)
      .single();

    let userId: string;

    if (existingUser) {
      // Existing user — update tokens
      userId = existingUser.id;
      await admin
        .from("users")
        .update({
          email,
          display_name: profile.display_name,
          avatar_url: avatarUrl,
          spotify_access_token: tokens.access_token,
          spotify_refresh_token: tokens.refresh_token || undefined,
          spotify_token_expires_at: tokenExpiresAt,
        })
        .eq("id", userId);
    } else {
      // New user — create Supabase Auth user, then insert into users table
      const { data: authUser, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            spotify_id: profile.id,
            display_name: profile.display_name,
            avatar_url: avatarUrl,
          },
        });

      if (createError) {
        throw new Error(`Failed to create auth user: ${createError.message}`);
      }

      userId = authUser.user.id;

      // Insert into users table
      const { error: insertError } = await admin.from("users").insert({
        id: userId,
        spotify_id: profile.id,
        email,
        display_name: profile.display_name,
        avatar_url: avatarUrl,
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_token_expires_at: tokenExpiresAt,
        credits_remaining: CREDITS.INITIAL_CREDITS,
      });

      if (insertError) {
        throw new Error(`Failed to insert user record: ${insertError.message}`);
      }
    }

    // Sign in with Supabase to establish session → RLS works
    // Create a Supabase client that can set cookies on the response
    const response = NextResponse.redirect(`${appUrl}${ROUTES.HOME}`);

    // Clear the OAuth state cookie
    response.cookies.delete("spotify_oauth_state");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw new Error(`Failed to sign in: ${signInError.message}`);
    }

    return response;
  } catch (err) {
    console.error("Spotify OAuth callback error:", err);
    return NextResponse.redirect(
      `${appUrl}${ROUTES.LOGIN}?error=auth_failed`
    );
  }
}
