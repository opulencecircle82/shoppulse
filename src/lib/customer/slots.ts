import { formatTimeOfDay } from "@/lib/dashboard/format";

/** Used when a shop hasn't set its working hours yet — a normal working day. */
const DEFAULT_OPEN_HOUR = 8;
const DEFAULT_CLOSE_HOUR = 17;

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function hourOf(time: string | null): number | null {
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

/**
 * The start times ("09:00:00") a customer can pick, one per hour from the shop's
 * opening hour up to its closing hour. Falls back to 8 AM - 5 PM while the shop has
 * no hours (or hours that don't make a same-day window).
 */
export function slotTimes(open: string | null, close: string | null): string[] {
  let from = hourOf(open) ?? DEFAULT_OPEN_HOUR;
  let to = hourOf(close) ?? DEFAULT_CLOSE_HOUR;
  if (to <= from) {
    from = DEFAULT_OPEN_HOUR;
    to = DEFAULT_CLOSE_HOUR;
  }
  return Array.from({ length: to - from }, (_, i) => `${String(from + i).padStart(2, "0")}:00:00`);
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1, day + days));
}

/** How far ahead a request can be scheduled (matches the booking calendar). */
export const MAX_DAYS_AHEAD = 14;

/**
 * The first day after `fromIso` the shop works (an empty list of business days means
 * any day) and that is still inside the booking window, or null if there is none.
 */
export function nextOpenDay(fromIso: string, businessDays: string[]): string | null {
  for (let step = 1; step <= MAX_DAYS_AHEAD; step++) {
    const iso = addDaysIso(fromIso, step);
    const [year, month, day] = iso.split("-").map(Number);
    const code = DAY_CODES[new Date(year, month - 1, day).getDay()];
    if (businessDays.length === 0 || businessDays.includes(code)) {
      const today = toIsoDate(new Date());
      return iso <= addDaysIso(today, MAX_DAYS_AHEAD) ? iso : null;
    }
  }
  return null;
}

/** "Tue, Sep 29" — a date in the customer's own words. */
export function formatDayLong(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export { formatTimeOfDay };
