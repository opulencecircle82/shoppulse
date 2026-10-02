import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

/** No-op (never throws) when RESEND_API_KEY isn't set — email notifications are a best-effort
 * extra, never something that should block a booking or crash a route that calls it. */
export const resend = apiKey ? new Resend(apiKey) : null;

/** Resend's own shared test domain — works immediately with no DNS setup, but shows as coming
 * from "resend.dev" rather than the business's own name. Swap for a verified sending domain
 * (e.g. notifications@shoppulse.app) once one is set up with Resend. */
export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "ShopPulse <onboarding@resend.dev>";
