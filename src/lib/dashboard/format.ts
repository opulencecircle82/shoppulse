export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Formats a Postgres `date` ("YYYY-MM-DD"). `new Date("2026-09-29")` parses as
 * UTC midnight, which renders as Sep 28 anywhere west of UTC (i.e. all of the
 * US), so build the date from its parts in local time instead.
 */
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString();
}

/** "9/29/2026 at 9:00 AM" — the day a customer asked for, plus the hour if they picked one. */
export function formatPreferred(date: string, time: string | null | undefined): string {
  return time ? `${formatDateOnly(date)} at ${formatTimeOfDay(time)}` : formatDateOnly(date);
}

/** Formats a Postgres `time` ("09:00:00") as the reader's clock would: "9:00 AM". */
export function formatTimeOfDay(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "just now", "12m ago", "3h ago", "2d ago" — how long a job has been in its current stage. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
