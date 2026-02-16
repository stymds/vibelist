import { NextResponse } from "next/server";
import { buildSpotifyAuthUrl } from "@/lib/spotify/auth";

export async function GET() {
  const state = crypto.randomUUID();
  const url = buildSpotifyAuthUrl(state);

  const response = NextResponse.redirect(url);

  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  console.log("[OAuth] login — setting state cookie:", state);

  return response;
}
