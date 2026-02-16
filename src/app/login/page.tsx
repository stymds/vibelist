import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SpotifyLoginButton } from "@/components/spotify-login-button";
import { ROUTES } from "@/lib/constants";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(ROUTES.HOME);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="brand-glow">VibeList AI</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Turn your vibe into a Spotify playlist
          </p>
        </div>

        <SpotifyLoginButton />

        <p className="text-xs text-muted-foreground leading-relaxed">
          We&apos;ll create playlists in your Spotify account.
          <br />
          We never touch your existing playlists.
        </p>
      </div>
    </main>
  );
}
