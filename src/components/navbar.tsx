import { createClient } from "@/lib/supabase/server";
import { CREDITS } from "@/lib/constants";
import { NavbarClient } from "@/components/navbar-client";
import { NavbarLogo } from "@/components/navbar-logo";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let credits = CREDITS.INITIAL_CREDITS;
  let displayName: string | null = null;
  let avatarUrl: string | null = null;

  if (user) {
    const { data } = await supabase
      .from("users")
      .select("credits_remaining, display_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) {
      credits = data.credits_remaining;
      displayName = data.display_name;
      avatarUrl = data.avatar_url;
    }
  }

  return (
    <nav className="w-full">
      <div className="mx-auto max-w-4xl flex items-center justify-between px-4 h-16">
        <NavbarLogo />

        <NavbarClient
          isAuthenticated={!!user}
          credits={credits}
          maxCredits={CREDITS.MAX_CREDITS}
          displayName={displayName}
          avatarUrl={avatarUrl}
        />
      </div>
    </nav>
  );
}
