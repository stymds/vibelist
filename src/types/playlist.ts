import type { InputType, TrackInfo } from "@/types/database";

export interface GenerateRequest {
  input_type: InputType;
  input_text?: string;
  input_image_urls?: string[];
  track_count: number;
}

export interface GenerateResponse {
  playlist_id: string;
  playlist_name: string;
  tracks: TrackInfo[];
  credits_remaining: number;
}

export interface RegenerateResponse {
  playlist_id: string;
  playlist_name: string;
  tracks: TrackInfo[];
  credits_remaining: number;
  was_free: boolean;
}

export interface CreatePlaylistResponse {
  spotify_playlist_id: string;
  spotify_playlist_url: string;
}

export type CreateFlowStep =
  | "idle"
  | "input"
  | "generating"
  | "song_list"
  | "creating_playlist"
  | "result"
  | "error";

export interface CreateFlowState {
  step: CreateFlowStep;
  input_type: InputType;
  input_text: string;
  input_image_urls: string[];
  input_image_files: File[];
  track_count: number;
  playlist_id: string | null;
  playlist_name: string | null;
  tracks: TrackInfo[];
  spotify_playlist_url: string | null;
  is_public: boolean;
  regeneration_used: boolean;
  error: string | null;
  error_type?: string | null;
}

export interface AiAnalysisResult {
  playlist_name: string;
  songs: Array<{
    title: string;
    artist: string;
  }>;
}
