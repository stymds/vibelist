export type InputType = "text" | "image";

export type PlaylistStatus = "generating" | "song_list" | "created" | "failed";

export interface TrackInfo {
  title: string;
  artist: string;
  spotify_track_id: string;
}

export interface DbUser {
  id: string;
  spotify_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  spotify_access_token: string;
  spotify_refresh_token: string;
  spotify_token_expires_at: string;
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface DbPlaylist {
  id: string;
  user_id: string;
  spotify_playlist_id: string | null;
  spotify_playlist_url: string | null;
  name: string;
  input_type: InputType;
  input_text: string | null;
  input_image_urls: string[] | null;
  track_count: number;
  tracks: TrackInfo[];
  is_public: boolean;
  regeneration_used: boolean;
  credits_charged: number;
  status: PlaylistStatus;
  created_at: string;
}
