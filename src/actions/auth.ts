"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildSpotifyAuthUrl } from "@/lib/spotify/auth";
import { ROUTES } from "@/lib/constants";

export async function getSpotifyAuthUrl(): Promise<string> {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();

  cookieStore.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return buildSpotifyAuthUrl(state);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.HOME);
}
