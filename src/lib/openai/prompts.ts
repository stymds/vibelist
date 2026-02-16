import type { AiAnalysisResult } from "@/types/playlist";
import { getOpenAIClient } from "@/lib/openai/client";
import { CANDIDATE_MULTIPLIER } from "@/lib/constants";

const SYSTEM_PROMPT = `You are a music expert AI that creates Spotify playlists based on vibes, moods, and emotions. Your job is to analyze the user's input and generate a curated list of real, existing songs that match the described vibe.

Rules:
1. Only suggest REAL songs that exist on Spotify. Do not make up songs.
2. Ensure variety — mix popular and lesser-known tracks. No two songs by the same artist in a row.
3. Match the emotional tone, energy level, and atmosphere of the described vibe.
4. Generate a creative, evocative playlist name that captures the vibe.
5. Return your response as valid JSON with this exact structure:
{
  "playlist_name": "string",
  "songs": [
    { "title": "string", "artist": "string" }
  ]
}
6. Do NOT include any markdown formatting, code blocks, or explanations. Return ONLY the JSON object.`;

export async function generatePlaylist(
  text: string | null,
  imageUrls: string[],
  trackCount: number,
  excludeTracks?: Array<{ title: string; artist: string }>
): Promise<AiAnalysisResult> {
  const client = getOpenAIClient();
  const candidateCount = trackCount * CANDIDATE_MULTIPLIER;

  const hasText = text && text.trim().length > 0;
  const hasImages = imageUrls.length > 0;

  let userPrompt: string;
  if (hasText && hasImages) {
    userPrompt = `Analyze these images along with this vibe description and generate ${candidateCount} song candidates for a playlist that matches. Description: "${text}"\n\nThe final playlist should have ${trackCount} songs, but give me ${candidateCount} candidates so I can filter.`;
  } else if (hasImages) {
    userPrompt = `Analyze these images and generate ${candidateCount} song candidates for a playlist that matches their vibe, mood, colors, and atmosphere. The final playlist should have ${trackCount} songs, but give me ${candidateCount} candidates so I can filter.`;
  } else {
    userPrompt = `Generate ${candidateCount} song candidates for a playlist based on this vibe:\n\n"${text}"\n\nThe final playlist should have ${trackCount} songs, but give me ${candidateCount} candidates so I can filter.`;
  }

  if (excludeTracks && excludeTracks.length > 0) {
    const sanitize = (s: string) => s.replace(/[\n\r\t\x00-\x1f]/g, " ").trim();
    const exclusionList = excludeTracks
      .map((t) => `"${sanitize(t.title)}" by ${sanitize(t.artist)}`)
      .join(", ");
    userPrompt += `\n\nIMPORTANT: Do NOT include any of these songs: ${exclusionList}. Generate completely different songs.`;
  }

  // Build message content array
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: userPrompt }];

  for (const url of imageUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: hasImages ? content : userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.9,
    max_tokens: 2000,
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error("No response from AI");
  }

  // Strip markdown code fences if present
  const cleaned = responseContent
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as AiAnalysisResult;
  } catch {
    console.error("Failed to parse AI response:", responseContent);
    throw new Error("AI returned invalid response. Please try again.");
  }
}
