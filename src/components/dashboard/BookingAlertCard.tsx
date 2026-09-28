import { BellRing, CalendarDays, Clock, MapPin, Siren, VolumeX } from "lucide-react";
import { formatPreferred, timeAgo } from "@/lib/dashboard/format";

export type BookingAlertCardProps = {
  /** An emergency booking — louder look, red instead of orange. */
  urgent: boolean;
  clientName: string;
  service: string;
  address: string | null;
  preferredDate: string | null;
  /** The hour the customer picked for a scheduled request, if any. */
  preferredTime?: string | null;
  requestedAt: string;
  /** The alert is currently ringing, so show the animation and the silence button. */
  ringing?: boolean;
  onSilence?: () => void;
  onView: () => void;
  onDismiss: () => void;
};

/**
 * One popup for one new booking request. Ordinary bookings are calm orange;
 * emergencies are red, pulse and say so, so the owner can tell which one to
 * drop everything for without reading a word. The same card is used live on
 * the dashboard and as the sample in Settings, so what they preview is what
 * they get.
 */
export default function BookingAlertCard({
  urgent,
  clientName,
  service,
  address,
  preferredDate,
  preferredTime = null,
  requestedAt,
  ringing = false,
  onSilence,
  onView,
  onDismiss,
}: BookingAlertCardProps) {
  return (
    <div
      role="alertdialog"
      aria-label={urgent ? "Urgent booking request" : "New booking request"}
      className={`animate-[booking-in_0.35s_ease-out] overflow-hidden rounded-2xl bg-white motion-reduce:animate-none ${
        urgent
          ? `border-2 border-red-500 shadow-2xl shadow-red-500/40 ${
              ringing ? "animate-[booking-glow_1.3s_ease-out_infinite] motion-reduce:animate-none" : ""
            }`
          : "border border-slate-200/70 shadow-2xl shadow-slate-900/15"
      }`}
    >
      <header
        className={`flex items-center gap-3 px-4 py-3 ${
          urgent ? "bg-red-500 text-white" : "border-b border-brand-orange/25 bg-brand-orange/15"
        }`}
      >
        <span
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            urgent ? "bg-white/20 text-white" : "bg-white text-brand-orange-dark shadow-sm shadow-slate-900/10"
          }`}
        >
          {ringing && (
            <span
              className={`absolute inset-0 animate-ping rounded-full motion-reduce:hidden ${
                urgent ? "bg-white/40" : "bg-brand-orange/30"
              }`}
            />
          )}
          {urgent ? (
            <Siren className="relative h-5 w-5" />
          ) : (
            <BellRing
              className={`relative h-5 w-5 origin-top ${
                ringing ? "animate-[booking-ring_1.2s_ease-in-out_infinite] motion-reduce:animate-none" : ""
              }`}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${urgent ? "text-white" : "text-slate-900"}`}>
            {urgent ? "🚨 URGENT BOOKING" : "New booking request"}
          </p>
          <p className={`text-xs ${urgent ? "text-white/90" : "text-slate-600"}`}>
            {urgent ? "Emergency — respond right away" : `Received ${timeAgo(requestedAt)}`}
          </p>
        </div>
        {ringing && onSilence && (
          <button
            type="button"
            onClick={onSilence}
            aria-label="Silence the ring"
            title="Silence the ring"
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-colors ${
              urgent
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-white text-slate-600 shadow-sm shadow-slate-900/10 hover:text-brand-blue"
            }`}
          >
            <VolumeX className="h-3.5 w-3.5" />
            Silence
          </button>
        )}
      </header>

      <div className="space-y-2 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{clientName}</p>
          <p className="text-xs text-slate-600">{service}</p>
        </div>
        <div className="space-y-1.5 text-xs text-slate-600">
          {address && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0 break-words">{address}</span>
            </p>
          )}
          {preferredDate && (
            <p className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Preferred: {formatPreferred(preferredDate, preferredTime)}
            </p>
          )}
          {urgent && (
            <p className="flex items-center gap-2 font-medium text-red-600">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Received {timeAgo(requestedAt)}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onView}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${
              urgent ? "bg-red-500" : "bg-gradient-to-r from-brand-sky to-brand-blue-dark"
            }`}
          >
            {urgent ? "Respond Now" : "View Request"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
