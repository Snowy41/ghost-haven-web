/**
 * Site-wide ambient background.
 * - Two slow-drifting cherry-red radial glows
 * - A faint grid overlay for depth
 * - A vignette to keep focus on content
 * Sits behind everything (z -10), pointer-events disabled.
 */
const AmbientBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Faint grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      {/* Drifting cherry-red glow #1 */}
      <div
        className="absolute -top-40 -left-40 h-[55vmax] w-[55vmax] rounded-full blur-3xl opacity-30 animate-ambient-drift"
        style={{
          background:
            "radial-gradient(circle at center, hsl(348 80% 50% / 0.55), transparent 60%)",
        }}
      />

      {/* Drifting cherry-red glow #2 */}
      <div
        className="absolute -bottom-40 -right-40 h-[60vmax] w-[60vmax] rounded-full blur-3xl opacity-25 animate-ambient-drift-slow"
        style={{
          background:
            "radial-gradient(circle at center, hsl(340 85% 45% / 0.5), transparent 60%)",
        }}
      />

      {/* Subtle ember accent */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40vmax] w-[40vmax] rounded-full blur-3xl opacity-10"
        style={{
          background:
            "radial-gradient(circle at center, hsl(355 75% 60% / 0.4), transparent 70%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, hsl(220 20% 3% / 0.7) 100%)",
        }}
      />
    </div>
  );
};

export default AmbientBackground;
