import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SpotifyLoginButton } from "@/components/spotify-login-button";
import { ROUTES } from "@/lib/constants";

function ErrorMessage({ error }: { error: string }) {
  if (error === "access_denied") {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300 space-y-2">
        <p>VibeList is currently in limited beta. We can&apos;t accept new users right now.</p>
        <a
          href="mailto:satyamdas020399@gmail.com?subject=VibeList%20Beta%20Access%20Request"
          className="inline-block text-red-400 underline underline-offset-2 hover:text-red-300"
        >
          Contact the developer for access
        </a>
      </div>
    );
  }

  if (error === "auth_failed") {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
        <p>Authentication failed. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
      <p>Something went wrong. Please try again.</p>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !error) {
    redirect(ROUTES.HOME);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 text-center space-y-6">
        {error && <ErrorMessage error={error} />}
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
