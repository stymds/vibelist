"use client";

const NOTES = ["♪", "♫", "♬", "♩"];

const COLORS = [
  "rgba(176, 38, 255, 0.12)",  // purple
  "rgba(0, 240, 255, 0.10)",   // cyan
  "rgba(41, 121, 255, 0.10)",  // blue
  "rgba(255, 45, 149, 0.08)",  // magenta
];

const PARTICLE_COUNT = 15;

function getParticleStyle(index: number) {
  const left = ((index * 37 + 13) % 100);
  const duration = 12 + ((index * 7 + 3) % 17); // 12-28s
  const delay = ((index * 5 + 2) % 20);
  const fontSize = 12 + ((index * 3) % 10); // 12-21px

  return {
    left: `${left}%`,
    fontSize: `${fontSize}px`,
    color: COLORS[index % COLORS.length],
    "--float-duration": `${duration}s`,
    "--float-delay": `-${delay}s`,
  } as React.CSSProperties;
}

export function MusicParticles() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[1] hidden md:block overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <span
          key={i}
          className="music-particle absolute bottom-0 select-none"
          style={getParticleStyle(i)}
        >
          {NOTES[i % NOTES.length]}
        </span>
      ))}
    </div>
  );
}
