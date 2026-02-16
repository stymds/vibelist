"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { TrackInfo, InputType } from "@/types/database";
import { CREDITS } from "@/lib/constants";
import { RefreshCw, Loader2, ArrowLeft } from "lucide-react";

interface SongListProps {
  tracks: TrackInfo[];
  playlistName: string;
  inputType: InputType;
  regenerationUsed: boolean;
  isPublic: boolean;
  onRegenerate: () => void;
  onVisibilityChange: (isPublic: boolean) => void;
  onCreatePlaylist: () => void;
  isRegenerating: boolean;
  isCreating: boolean;
  credits: number;
  onBack?: () => void;
}

export function SongList({
  tracks,
  playlistName,
  inputType,
  regenerationUsed,
  isPublic,
  onRegenerate,
  onVisibilityChange,
  onCreatePlaylist,
  isRegenerating,
  isCreating,
  credits,
  onBack,
}: SongListProps) {
  const regenCost = regenerationUsed
    ? inputType === "text"
      ? CREDITS.TEXT_COST
      : CREDITS.IMAGE_COST
    : 0;

  const canRegenerate = !regenerationUsed || credits >= regenCost;

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Start Over
        </button>
      )}

      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold">{playlistName}</h3>
        <p className="text-sm text-muted-foreground">
          {tracks.length} songs curated for your vibe
        </p>
      </div>

      <div className="space-y-1">
        {tracks.map((track, index) => (
          <div
            key={track.spotify_track_id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{
              animationDelay: `${index * 50}ms`,
              animation: "fadeIn 0.3s ease-out forwards",
              opacity: 0,
            }}
          >
            <span className="text-sm text-muted-foreground w-6 text-right font-mono">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{track.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {track.artist}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating || !canRegenerate}
          className="cursor-pointer"
        >
          {isRegenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Regenerate {regenCost === 0 ? "(free)" : `(${regenCost} credit${regenCost > 1 ? "s" : ""})`}
        </Button>

        <div className="flex items-center gap-2">
          <label htmlFor="visibility" className="text-sm text-muted-foreground">
            {isPublic ? "Public" : "Private"}
          </label>
          <Switch
            id="visibility"
            checked={isPublic}
            onCheckedChange={onVisibilityChange}
          />
        </div>
      </div>

      <Button
        onClick={onCreatePlaylist}
        disabled={isCreating}
        className="w-full bg-gradient-to-r from-[var(--neon-purple)] to-[#2979FF] hover:shadow-[0_0_20px_rgba(176,38,255,0.4)] text-white font-semibold py-6 rounded-xl cursor-pointer transition-all duration-200"
      >
        {isCreating ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Creating Playlist...
          </span>
        ) : (
          "Create Playlist on Spotify"
        )}
      </Button>
    </div>
  );
}
