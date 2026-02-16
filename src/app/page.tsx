import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { CREDITS } from "@/lib/constants";
import { HomeContent } from "@/components/home-content";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let credits = CREDITS.INITIAL_CREDITS;

  if (user) {
    const { data } = await supabase
      .from("users")
      .select("credits_remaining")
      .eq("id", user.id)
      .single();

    if (data) {
      credits = data.credits_remaining;
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <p className="brand-glow font-bold text-lg sm:text-3xl tracking-widest">
              VibeList AI
            </p>
            <h1 className="text-4xl sm:text-4xl font-bold tracking-tight">
              Turn your vibe into a Spotify playlist
            </h1>
            <p className="text-muted-foreground text-lg">
              Describe a mood or upload an image — AI handles the rest.
            </p>
          </div>

          <HomeContent
            isAuthenticated={!!user}
            credits={credits}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
