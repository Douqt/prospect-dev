export function GridBackground() {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none grid-background"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
      }}
    />
  );
}
