import { z } from "zod";
import { INPUT_LIMITS, SONG_COUNT } from "@/lib/constants";

export const textInputSchema = z.object({
  input_type: z.literal("text"),
  input_text: z
    .string()
    .min(INPUT_LIMITS.TEXT_MIN_LENGTH, `Must be at least ${INPUT_LIMITS.TEXT_MIN_LENGTH} characters`)
    .max(INPUT_LIMITS.TEXT_MAX_LENGTH, `Must be at most ${INPUT_LIMITS.TEXT_MAX_LENGTH} characters`),
  track_count: z
    .number()
    .int()
    .min(SONG_COUNT.MIN)
    .max(SONG_COUNT.MAX),
});

export const imageInputSchema = z.object({
  input_type: z.literal("image"),
  input_image_urls: z.array(z.string().url("Invalid image URL")).min(1).max(INPUT_LIMITS.MAX_IMAGES),
  track_count: z
    .number()
    .int()
    .min(SONG_COUNT.MIN)
    .max(SONG_COUNT.MAX),
});

export const generateSchema = z.discriminatedUnion("input_type", [
  textInputSchema,
  imageInputSchema,
]);

export const regenerateSchema = z.object({
  exclude_tracks: z.array(
    z.object({
      title: z.string(),
      artist: z.string(),
    })
  ),
});

export const visibilitySchema = z.object({
  is_public: z.boolean(),
});
