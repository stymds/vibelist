const BAR_COLORS = [
  "bg-[var(--neon-purple)]",
  "bg-[var(--neon-cyan)]",
  "bg-[var(--neon-blue)]",
];

const SIZES = {
  sm: { width: "w-0.5", height: "h-3", gap: "gap-0.5" },
  md: { width: "w-1", height: "h-4", gap: "gap-[3px]" },
} as const;

export function Equalizer({
  bars = 3,
  size = "sm",
  className = "",
}: {
  bars?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const s = SIZES[size];

  return (
    <span
      className={`inline-flex items-end ${s.gap} ${s.height} ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={`equalizer-bar inline-block ${s.width} ${s.height} rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
          style={{
            "--eq-duration": `${0.6 + (i % 3) * 0.15}s`,
            "--eq-delay": `${i * 0.12}s`,
          } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
