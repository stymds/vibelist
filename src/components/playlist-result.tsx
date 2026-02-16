"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Copy, PlusCircle } from "lucide-react";

interface PlaylistResultProps {
  playlistName: string;
  spotifyUrl: string;
  onCreateAnother: () => void;
}

export function PlaylistResult({
  playlistName,
  spotifyUrl,
  onCreateAnother,
}: PlaylistResultProps) {
  async function handleShare() {
    try {
      await navigator.clipboard.writeText(spotifyUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-in fade-in-0 zoom-in-95 duration-500">
      <div className="h-16 w-16 rounded-full bg-[var(--neon-green)]/20 flex items-center justify-center">
        <svg
          className="h-8 w-8 text-[var(--neon-green)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold text-[var(--neon-green)]">
          Playlist Created!
        </h3>
        <p className="text-muted-foreground text-sm">{playlistName}</p>
      </div>

      <a
        href={spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full block rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-4 hover:bg-white/[0.06] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#1DB954] flex items-center justify-center flex-shrink-0">
            <svg
              className="h-6 w-6 text-black"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Open in Spotify</p>
            <p className="text-xs text-muted-foreground truncate">
              {playlistName}
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        </div>
      </a>

      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          onClick={handleShare}
          className="flex-1 cursor-pointer"
        >
          <Copy className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button
          variant="outline"
          onClick={onCreateAnother}
          className="flex-1 cursor-pointer"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Another
        </Button>
      </div>
    </div>
  );
}
