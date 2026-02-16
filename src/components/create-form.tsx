"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GenerationLoader } from "@/components/generation-loader";
import { SongList } from "@/components/song-list";
import { PlaylistResult } from "@/components/playlist-result";
import { toast } from "sonner";
import { CREDITS, SONG_COUNT, INPUT_LIMITS } from "@/lib/constants";
import type { CreateFlowState, CreateFlowStep } from "@/types/playlist";
import { Camera, Upload, X } from "lucide-react";

interface CreateFormProps {
  isAuthenticated: boolean;
  credits: number;
  onNeedLogin: () => void;
  onCreditsChange?: () => void;
}

const PLACEHOLDER_VIBES = [
  "thinking about someone you shouldn't miss...",
  "rain outside, warm room, nowhere to be, nothing to prove...",
  "Sunday kitchen energy, old 90s Hindi songs playing softly...",
  "spicy date night, neon red lights, like the world ends tomorrow...",
  "night drive, empty roads, bass up, thoughts loud...",
  "solo café corner, headphones on, ignoring the universe...",
  "gym mode, zero emotions, pure aggression...",
  "beach sunset, salty air, everything feels cinematic...",
  "villain arc, no apologies, no regrets...",
];

function pickRandomPair(): [string, string] {
  const first = Math.floor(Math.random() * PLACEHOLDER_VIBES.length);
  let second = Math.floor(Math.random() * (PLACEHOLDER_VIBES.length - 1));
  if (second >= first) second++;
  return [PLACEHOLDER_VIBES[first], PLACEHOLDER_VIBES[second]];
}

const initialState: CreateFlowState = {
  step: "input",
  input_type: "text",
  input_text: "",
  input_image_urls: [],
  input_image_files: [],
  track_count: SONG_COUNT.DEFAULT,
  playlist_id: null,
  playlist_name: null,
  tracks: [],
  spotify_playlist_url: null,
  is_public: true,
  regeneration_used: false,
  error: null,
};

export function CreateForm({
  isAuthenticated,
  credits,
  onNeedLogin,
  onCreditsChange,
}: CreateFormProps) {
  const [state, setState] = useState<CreateFlowState>(initialState);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [desktopPopoverOpen, setDesktopPopoverOpen] = useState(false);
  const [mobilePopoverOpen, setMobilePopoverOpen] = useState(false);
  const [imagePreviewIndex, setImagePreviewIndex] = useState<number | null>(null);
  const [placeholderPair, setPlaceholderPair] = useState<[string, string]>([PLACEHOLDER_VIBES[0], PLACEHOLDER_VIBES[1]]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlaceholderPair(pickRandomPair());
    if (state.input_text.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderPair(pickRandomPair());
    }, 6000);
    return () => clearInterval(interval);
  }, [state.input_text.length]);

  useEffect(() => {
    if (imagePreviewIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImagePreviewIndex(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [imagePreviewIndex]);

  const hasValidText =
    state.input_text.length >= INPUT_LIMITS.TEXT_MIN_LENGTH &&
    state.input_text.length <= INPUT_LIMITS.TEXT_MAX_LENGTH;
  const hasImage = state.input_image_files.length > 0;
  const isInputValid = hasValidText || hasImage;

  const effectiveInputType = hasImage ? "image" : "text";
  const currentCost =
    effectiveInputType === "text" ? CREDITS.TEXT_COST : CREDITS.IMAGE_COST;
  const hasEnoughCredits = credits >= currentCost;

  const updateState = useCallback(
    (updates: Partial<CreateFlowState>) =>
      setState((prev) => ({ ...prev, ...updates })),
    []
  );

  const setStep = useCallback(
    (step: CreateFlowStep) => updateState({ step }),
    [updateState]
  );

  function validateFile(file: File): string | null {
    if (!INPUT_LIMITS.ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Please upload a JPG, PNG, or WebP image.";
    }
    if (file.size > INPUT_LIMITS.IMAGE_MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${INPUT_LIMITS.IMAGE_MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  function handleFile(file: File) {
    if (state.input_image_files.length >= INPUT_LIMITS.MAX_IMAGES) {
      setImageError(`Maximum ${INPUT_LIMITS.MAX_IMAGES} images allowed.`);
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setImageError(validationError);
      return;
    }
    setImageError(null);
    const previewUrl = URL.createObjectURL(file);
    setState((prev) => ({
      ...prev,
      input_image_files: [...prev.input_image_files, file],
      input_image_urls: [...prev.input_image_urls, previewUrl],
    }));
  }

  function handleImageRemove(index: number) {
    setState((prev) => {
      URL.revokeObjectURL(prev.input_image_urls[index]);
      return {
        ...prev,
        input_image_files: prev.input_image_files.filter((_, i) => i !== index),
        input_image_urls: prev.input_image_urls.filter((_, i) => i !== index),
      };
    });
    setImageError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const remaining = INPUT_LIMITS.MAX_IMAGES - state.input_image_files.length;
    for (const file of files.slice(0, remaining)) {
      handleFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = INPUT_LIMITS.MAX_IMAGES - state.input_image_files.length;
    for (const file of files.slice(0, remaining)) {
      handleFile(file);
    }
    e.target.value = "";
  }

  async function handleGenerate() {
    if (!isAuthenticated) {
      onNeedLogin();
      return;
    }
    if (!hasEnoughCredits || !isInputValid) return;

    setStep("generating");

    try {
      const formData = new FormData();
      formData.append("track_count", String(state.track_count));

      // Always send text if non-empty
      if (state.input_text.trim()) {
        formData.append("input_text", state.input_text);
      }

      // Append each image file
      for (const file of state.input_image_files) {
        formData.append("image", file);
      }

      const response = await fetch("/api/playlists/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate playlist");
      }

      const data = await response.json();
      updateState({
        step: "song_list",
        playlist_id: data.playlist_id,
        playlist_name: data.playlist_name,
        tracks: data.tracks,
        regeneration_used: false,
      });
      toast.info(`Credit used. ${data.credits_remaining} remaining.`);
      onCreditsChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
      updateState({
        step: "error",
        error: message,
      });
    }
  }

  async function handleRegenerate() {
    if (!state.playlist_id) return;

    const regenCost = state.regeneration_used
      ? effectiveInputType === "text"
        ? CREDITS.TEXT_COST
        : CREDITS.IMAGE_COST
      : 0;

    if (regenCost > 0 && credits < regenCost) return;

    updateState({ step: "generating" });

    try {
      const response = await fetch(
        `/api/playlists/${state.playlist_id}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exclude_tracks: state.tracks.map((t) => ({
              title: t.title,
              artist: t.artist,
            })),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to regenerate");
      }

      const data = await response.json();
      updateState({
        step: "song_list",
        playlist_name: data.playlist_name,
        tracks: data.tracks,
        regeneration_used: true,
      });
      if (data.was_free) {
        toast.info("Free regeneration used.");
      } else {
        toast.info(`Credit used. ${data.credits_remaining} remaining.`);
      }
      onCreditsChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
      updateState({
        step: "song_list",
        error: message,
      });
    }
  }

  async function handleCreatePlaylist() {
    if (!state.playlist_id) return;

    updateState({ step: "creating_playlist" });

    try {
      const response = await fetch(
        `/api/playlists/${state.playlist_id}/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_public: state.is_public }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create playlist");
      }

      const data = await response.json();
      updateState({
        step: "result",
        spotify_playlist_url: data.spotify_playlist_url,
      });
      toast.success("Playlist created!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create playlist";
      toast.error(message);
      updateState({
        step: "song_list",
        error: message,
      });
    }
  }

  function handleVisibilityChange(isPublic: boolean) {
    updateState({ is_public: isPublic });

    if (state.playlist_id) {
      fetch(`/api/playlists/${state.playlist_id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: isPublic }),
      }).catch(() => {
        // Silently fail — not critical
      });
    }
  }

  function handleReset() {
    for (const url of state.input_image_urls) {
      URL.revokeObjectURL(url);
    }
    setState(initialState);
    setImageError(null);
  }

  // GENERATING STATE
  if (state.step === "generating" || state.step === "creating_playlist") {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-8">
        <GenerationLoader />
      </div>
    );
  }

  // SONG LIST STATE
  if (state.step === "song_list" && state.tracks.length > 0) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-6 sm:p-8">
        <SongList
          tracks={state.tracks}
          playlistName={state.playlist_name || "Your Playlist"}
          inputType={effectiveInputType}
          regenerationUsed={state.regeneration_used}
          isPublic={state.is_public}
          onRegenerate={handleRegenerate}
          onVisibilityChange={handleVisibilityChange}
          onCreatePlaylist={handleCreatePlaylist}
          isRegenerating={false}
          isCreating={false}
          credits={credits}
          onBack={handleReset}
        />
      </div>
    );
  }

  // RESULT STATE
  if (state.step === "result" && state.spotify_playlist_url) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-6 sm:p-8">
        <PlaylistResult
          playlistName={state.playlist_name || "Your Playlist"}
          spotifyUrl={state.spotify_playlist_url}
          onCreateAnother={handleReset}
        />
      </div>
    );
  }

  // ERROR STATE
  if (state.step === "error") {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-8 text-center space-y-4">
        <p className="text-destructive">{state.error || "Something went wrong"}</p>
        <Button variant="outline" onClick={handleReset} className="cursor-pointer">
          Try Again
        </Button>
      </div>
    );
  }

  // Photo popover content shared between desktop and mobile instances
  const canAddMore = state.input_image_files.length < INPUT_LIMITS.MAX_IMAGES;

  const photoPopoverContent = (close: () => void) => (
    <>
      <button
        onClick={() => {
          fileInputRef.current?.click();
          close();
        }}
        disabled={!canAddMore}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="h-4 w-4" />
        Upload Photo
      </button>
      <button
        onClick={() => {
          cameraInputRef.current?.click();
          close();
        }}
        disabled={!canAddMore}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Camera className="h-4 w-4" />
        Take Photo
      </button>
      {!canAddMore && (
        <p className="px-3 py-1 text-xs text-muted-foreground">
          Max {INPUT_LIMITS.MAX_IMAGES} images
        </p>
      )}
    </>
  );

  const createButton = (
    <Button
      onClick={handleGenerate}
      disabled={
        !isInputValid ||
        (isAuthenticated && !hasEnoughCredits)
      }
      className="flex-shrink-0 bg-gradient-to-r from-[var(--neon-purple)] to-[#2979FF] hover:shadow-[0_0_20px_rgba(176,38,255,0.4)] text-white font-semibold px-5 rounded-xl cursor-pointer transition-all duration-200 disabled:opacity-50"
    >
      {!isAuthenticated
        ? "Sign in"
        : !hasEnoughCredits
          ? "No credits"
          : "Create Playlist"}
    </Button>
  );

  // INPUT STATE (default)
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Unified warm card */}
      <div
        className={`rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-4 transition-shadow cursor-text ${isDragOver ? "drag-over-highlight" : ""}`}
        onClick={() => textareaRef.current?.focus()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Main body: textarea + mobile vertical slider */}
        <div className="flex flex-row">
          {/* Text area side */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={state.input_text}
              onChange={(e) => updateState({ input_text: e.target.value })}
              placeholder={`Describe your vibe...\n- - ${placeholderPair[0]}\n- - ${placeholderPair[1]}`}
              rows={5}
              maxLength={INPUT_LIMITS.TEXT_MAX_LENGTH}
              className="w-full bg-transparent text-[var(--warm-input-text)] placeholder:text-[var(--warm-input-text)]/40 text-sm resize-none focus:outline-none"
            />

            {/* Image thumbnails row */}
            {state.input_image_urls.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {state.input_image_urls.map((url, index) => (
                  <div key={index} className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Vibe image ${index + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreviewIndex(index);
                      }}
                      className="h-10 w-10 rounded-md object-cover cursor-pointer hover:ring-2 hover:ring-white/30 transition-all"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageRemove(index);
                      }}
                      className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors cursor-pointer"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageError && (
              <p className="text-sm text-destructive mt-1">{imageError}</p>
            )}
          </div>

          {/* Mobile vertical slider (no border divider) */}
          <div className="flex md:hidden flex-col items-center gap-2 pl-3 ml-3">
            <span className="text-xs text-muted-foreground">Songs</span>
            <Slider
              value={[state.track_count]}
              onValueChange={([value]) => updateState({ track_count: value })}
              min={SONG_COUNT.MIN}
              max={SONG_COUNT.MAX}
              step={1}
              orientation="vertical"
              className="min-h-24 flex-1"
            />
            <span className="text-sm font-mono text-[var(--neon-green)]">
              {state.track_count}
            </span>
          </div>
        </div>

        {/* Desktop bottom controls (no border-t divider) */}
        <div className="hidden md:flex items-center gap-3 mt-3">
          <Popover open={desktopPopoverOpen} onOpenChange={setDesktopPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 h-10 w-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Add photo"
              >
                <Camera className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start" onClick={(e) => e.stopPropagation()}>
              {photoPopoverContent(() => setDesktopPopoverOpen(false))}
            </PopoverContent>
          </Popover>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Songs</span>
            <Slider
              value={[state.track_count]}
              onValueChange={([value]) => updateState({ track_count: value })}
              min={SONG_COUNT.MIN}
              max={SONG_COUNT.MAX}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-mono text-[var(--neon-green)] w-6 text-right">
              {state.track_count}
            </span>
          </div>

          {createButton}
        </div>

        {/* Mobile bottom controls (no border-t divider) */}
        <div className="flex md:hidden items-center justify-between mt-3">
          <Popover open={mobilePopoverOpen} onOpenChange={setMobilePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 h-10 w-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Add photo"
              >
                <Camera className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start" onClick={(e) => e.stopPropagation()}>
              {photoPopoverContent(() => setMobilePopoverOpen(false))}
            </PopoverContent>
          </Popover>
          {createButton}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept={INPUT_LIMITS.ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Image preview overlay */}
      {imagePreviewIndex !== null && state.input_image_urls[imagePreviewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setImagePreviewIndex(null)}
        >
          <div className="relative max-w-[90vw] max-h-[85vh]">
            <button
              onClick={() => setImagePreviewIndex(null)}
              className="absolute -top-3 -right-3 z-10 p-1 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors cursor-pointer"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.input_image_urls[imagePreviewIndex]}
              alt="Vibe image preview"
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
