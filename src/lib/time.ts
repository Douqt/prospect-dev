/**
 * Converts an ISO timestamp to a human-readable "time ago" format
 * Displays relative time (e.g., "5m ago", "2h ago", "3d ago")
 * @param iso - ISO timestamp string or null/undefined
 * @returns Human-readable time difference string or empty string if invalid
 * @example
 * timeAgo("2024-01-15T10:30:00Z") // "2h ago" (if current time is 12:30)
 */
export function timeAgo(iso?: string | null): string {
  if (!iso) return "";

  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
