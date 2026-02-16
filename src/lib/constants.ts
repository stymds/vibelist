export const CREDITS = {
  TEXT_COST: 1,
  IMAGE_COST: 2,
  INITIAL_CREDITS: 5,
  MAX_CREDITS: 5,
} as const;

export const SONG_COUNT = {
  MIN: 5,
  MAX: 20,
  DEFAULT: 10,
} as const;

export const INPUT_LIMITS = {
  TEXT_MIN_LENGTH: 10,
  TEXT_MAX_LENGTH: 500,
  IMAGE_MAX_SIZE_MB: 10,
  IMAGE_MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ACCEPTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"] as string[],
  MAX_IMAGES: 3,
} as const;

export const RATE_LIMIT = {
  MAX_REQUESTS: 5,
  WINDOW_SECONDS: 60,
} as const;

export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
] as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  API_AUTH_CALLBACK: "/api/auth/callback/spotify",
  API_AUTH_REFRESH: "/api/auth/refresh-token",
  API_PLAYLISTS_GENERATE: "/api/playlists/generate",
  API_USER_CREDITS: "/api/user/credits",
} as const;

export const CANDIDATE_MULTIPLIER = 2;
