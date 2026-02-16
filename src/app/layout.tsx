import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { CursorGlow } from "@/components/cursor-glow";
import { MusicParticles } from "@/components/music-particles";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeList — Turn Your Vibe Into a Playlist",
  description:
    "Describe a mood, upload an image — AI creates a Spotify playlist that matches your vibe.",
};

export function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased min-h-screen bg-background text-foreground font-sans">
        <CursorGlow />
        <MusicParticles />
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}

export default RootLayout;
