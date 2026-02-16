"use client";

import { useEffect, useState, useMemo } from "react";

const STEPS = [
  "Analyzing your vibe...",
  "Finding the perfect songs...",
  "Curating your playlist...",
  "Almost there...",
];

const BAR_COUNT = 45;

function generateBars() {
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const t = i / (BAR_COUNT - 1);
    // Bell curve: tallest in center, shorter at edges
    const bell = Math.sin(t * Math.PI);
    // Layer random variation on top
    const variation = 0.7 + Math.random() * 0.3;
    const height = Math.max(4, bell * 40 * variation + 4);
    // Stagger animation delay for wave ripple effect
    const delay = (t * 2).toFixed(2);
    // Slightly varying duration for organic feel
    const duration = (0.8 + Math.random() * 0.6).toFixed(2);
    // Opacity: lower at edges, full at center
    const opacity = 0.3 + bell * 0.7;
    return { height, delay, duration, opacity };
  });
}

export function GenerationLoader() {
  const [stepIndex, setStepIndex] = useState(0);
  const bars = useMemo(() => generateBars(), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % STEPS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      {/* Waveform visualization */}
      <div className="flex items-center justify-center gap-[2px] w-full max-w-lg">
        {bars.map((bar, i) => (
          <span
            key={i}
            className="waveform-bar w-[3px] flex-shrink-0"
            style={{
              height: `${bar.height}px`,
              color: `rgba(176, 38, 255, ${bar.opacity})`,
              ["--dur" as string]: `${bar.duration}s`,
              ["--del" as string]: `${bar.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Cycling step text */}
      <p
        key={stepIndex}
        className="text-lg font-medium text-muted-foreground animate-pulse"
        style={{
          animation: "fadeIn 0.4s ease-out, pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      >
        {STEPS[stepIndex]}
      </p>
    </div>
  );
}
