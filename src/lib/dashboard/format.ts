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
