"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Analyzing your vibe...",
  "Finding the perfect songs...",
  "Curating your playlist...",
  "Almost there...",
];

export function GenerationLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % STEPS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div className="relative h-16 w-16 flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full border-4 border-white/10" />
        <div className="absolute h-16 w-16 rounded-full border-4 border-transparent border-t-[var(--neon-green)] animate-spin" />
        <div className="h-3 w-3 rounded-full bg-[var(--neon-green)] animate-pulse" />
      </div>
      <p className="text-lg font-medium text-muted-foreground animate-pulse">
        {STEPS[stepIndex]}
      </p>
    </div>
  );
}
