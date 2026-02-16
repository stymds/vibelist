import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CREDITS } from "@/lib/constants";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("credits_remaining")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    credits: data.credits_remaining,
    maxCredits: CREDITS.MAX_CREDITS,
  });
}
