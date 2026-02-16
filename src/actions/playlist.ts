"use server";

// Server actions for playlist operations — thin wrappers for Client Component usage

export async function generatePlaylist(formData: FormData) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/playlists/generate`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to generate playlist");
  }

  return response.json();
}

export async function regeneratePlaylist(
  playlistId: string,
  excludeTracks: Array<{ title: string; artist: string }>
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/playlists/${playlistId}/regenerate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exclude_tracks: excludeTracks }),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to regenerate");
  }

  return response.json();
}
