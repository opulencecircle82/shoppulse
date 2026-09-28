import { RINGTONE_BY_ID, type RingtoneId } from "./ringtones";

export type BookingAlertPrefs = {
  soundOn: boolean;
  /** Ring used for an ordinary booking request. */
  normalTone: RingtoneId;
  /** Ring used for an emergency booking request. */
  urgentTone: RingtoneId;
  /** 0.2 – 1, applied on top of each tone's own level. */
  volume: number;
};

export const DEFAULT_BOOKING_ALERT_PREFS: BookingAlertPrefs = {
  soundOn: true,
  normalTone: "bell",
  urgentTone: "siren",
  volume: 1,
};

// The ring is a per-device choice (the office computer and the owner's phone
// can sound different), so it lives in the browser rather than the database.
const STORAGE_KEY = "shoppulse.bookingAlerts.v1";

function pickTone(value: unknown, fallback: RingtoneId): RingtoneId {
  return typeof value === "string" && RINGTONE_BY_ID.has(value as RingtoneId)
    ? (value as RingtoneId)
    : fallback;
}

export function loadBookingAlertPrefs(): BookingAlertPrefs {
  const defaults = DEFAULT_BOOKING_ALERT_PREFS;
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<BookingAlertPrefs>;
    const volume = Number(parsed.volume);
    return {
      soundOn: typeof parsed.soundOn === "boolean" ? parsed.soundOn : defaults.soundOn,
      normalTone: pickTone(parsed.normalTone, defaults.normalTone),
      urgentTone: pickTone(parsed.urgentTone, defaults.urgentTone),
      volume: Number.isFinite(volume) ? Math.min(1, Math.max(0.2, volume)) : defaults.volume,
    };
  } catch {
    return defaults;
  }
}

export function saveBookingAlertPrefs(prefs: BookingAlertPrefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable (private mode) — the choice just won't persist.
  }
}
