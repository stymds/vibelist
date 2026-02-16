import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { CursorGlow } from "@/components/cursor-glow";
import { MusicParticles } from "@/components/music-particles";
import { SEO } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  // Base metadata
  metadataBase: new URL(SEO.URL),
  title: {
    default: SEO.TITLE,
    template: `%s | ${SEO.SITE_NAME}`,
  },
  description: SEO.DESCRIPTION,
  keywords: [...SEO.KEYWORDS],
  authors: [{ name: "Satyam Das" }],
  creator: "VibeList",
  publisher: "VibeList",

  // Robots & Indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SEO.URL,
    siteName: SEO.SITE_NAME,
    title: SEO.TITLE,
    description: SEO.DESCRIPTION,
    images: [
      {
        url: SEO.OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "VibeList - AI-powered Spotify playlist generator",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: SEO.TITLE,
    description: SEO.DESCRIPTION,
    images: [SEO.OG_IMAGE],
  },

  // Canonical URL
  alternates: {
    canonical: SEO.URL,
  },

  // Category
  category: "technology",
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
