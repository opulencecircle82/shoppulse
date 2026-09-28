const FALLBACK_TIMEZONE = "Asia/Manila";

/**
 * The timezone of the device the owner is setting the shop up on ("Asia/Manila"). It is saved with the
 * shop's working hours so the database can tell, in the shop's own time, whether it is closed right now
 * (that is what decides if an emergency belongs to the night shift).
 */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}
