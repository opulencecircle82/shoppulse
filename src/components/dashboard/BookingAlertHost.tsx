"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { fetchStaffNotifications, markAllNotificationsRead } from "@/lib/notifications";
import type { JobTicket } from "@/lib/supabase/types";
import { loadBookingAlertPrefs } from "@/lib/dashboard/bookingAlertPrefs";
import { installAudioUnlock, isAudioBlocked, startRinging } from "@/lib/dashboard/ringtones";
import BookingAlertCard from "./BookingAlertCard";

const POLL_MS = 10000;
const MAX_VISIBLE = 3;
/** An ordinary booking rings this many times; an emergency rings until answered. */
const NORMAL_RINGS = 3;
const BOOKING_TYPES = new Set(["new_booking", "emergency_booking"]);

type TicketInfo = Pick<
  JobTicket,
  | "id"
  | "status"
  | "client_name"
  | "service_type"
  | "service_address"
  | "preferred_date"
  | "preferred_time"
  | "created_at"
  | "is_emergency"
>;

type BookingNotification = {
  id: string;
  jobTicketId: string;
  type: string;
  createdAt: string;
};

/**
 * Watches for new booking requests and pops a widget for each one, ringing
 * the tone the owner picked in Settings. A widget stays until the request is
 * answered (accepted or rejected on the job board) or the owner dismisses it,
 * so nothing is missed if they step away. Emergencies get their own tone,
 * ring until someone responds, and look different from ordinary bookings.
 */
export default function BookingAlertHost({
  staffId,
  tickets,
  onNewBooking,
  onOpenBooking,
}: {
  staffId: string;
  /** The dashboard's own ticket list — lets a widget vanish the moment the request is handled on the board. */
  tickets: JobTicket[];
  /** A booking the dashboard hasn't loaded yet just arrived — refresh the job list. */
  onNewBooking: () => void;
  onOpenBooking: () => void;
}) {
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [ticketInfo, setTicketInfo] = useState<Record<string, TicketInfo>>({});
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [silenced, setSilenced] = useState<string[]>([]);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const onNewBookingRef = useRef(onNewBooking);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const ringRef = useRef<{ stop: () => void; urgent: boolean } | null>(null);
  const rungRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    onNewBookingRef.current = onNewBooking;
  }, [onNewBooking]);

  const load = useCallback(async () => {
    try {
      const rows = await fetchStaffNotifications(staffId);
      const unread: BookingNotification[] = rows
        .filter((n) => !n.readAt && BOOKING_TYPES.has(n.type) && n.jobTicketId)
        .map((n) => ({
          id: n.id,
          jobTicketId: n.jobTicketId as string,
          type: n.type,
          createdAt: n.createdAt,
        }));

      // The notification only says a request came in; the ticket says whether
      // it is still waiting for an answer.
      const infoById: Record<string, TicketInfo> = {};
      const ticketIds = Array.from(new Set(unread.map((n) => n.jobTicketId)));
      if (ticketIds.length > 0) {
        const { data } = await supabase
          .from("job_tickets")
          .select(
            "id, status, client_name, service_type, service_address, preferred_date, preferred_time, created_at, is_emergency"
          )
          .in("id", ticketIds);
        for (const row of (data ?? []) as TicketInfo[]) infoById[row.id] = row;
      }

      const known = knownIdsRef.current;
      const hasNew = unread.some((n) => known !== null && !known.has(n.id));
      knownIdsRef.current = new Set(unread.map((n) => n.id));
      if (hasNew) onNewBookingRef.current();

      setNotifications(unread);
      setTicketInfo(infoById);
    } catch {
      // A dropped connection just skips this check; the next poll retries.
    }
  }, [staffId]);

  useEffect(() => {
    let active = true;
    const first = setTimeout(() => {
      if (active) load();
    }, 0);
    const interval = setInterval(() => {
      if (active) load();
    }, POLL_MS);
    return () => {
      active = false;
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [load]);

  useEffect(() => installAudioUnlock(), []);

  const alerts = useMemo(() => {
    return notifications
      .filter((n) => !dismissed.includes(n.id))
      .flatMap((n) => {
        const info = ticketInfo[n.jobTicketId];
        if (!info || info.status !== "PENDING") return [];
        const onBoard = tickets.find((t) => t.id === n.jobTicketId);
        if (onBoard && onBoard.status !== "PENDING") return [];
        return [
          {
            id: n.id,
            urgent: n.type === "emergency_booking" || info.is_emergency,
            info,
          },
        ];
      })
      .sort(
        (a, b) =>
          Number(b.urgent) - Number(a.urgent) ||
          Date.parse(b.info.created_at) - Date.parse(a.info.created_at)
      );
  }, [notifications, ticketInfo, dismissed, tickets]);

  // Ring for anything new that hasn't been silenced. An emergency takes over
  // with its own tone and keeps going until it is answered.
  useEffect(() => {
    const ringing = alerts.filter((a) => !silenced.includes(a.id));
    const urgent = ringing.some((a) => a.urgent);
    const hasNew = ringing.some((a) => !rungRef.current.has(a.id));

    if (ringing.length === 0 || (!hasNew && ringRef.current?.urgent && !urgent)) {
      ringRef.current?.stop();
      ringRef.current = null;
      return;
    }
    if (!hasNew) return;

    ringing.forEach((a) => rungRef.current.add(a.id));
    ringRef.current?.stop();
    const prefs = loadBookingAlertPrefs();
    if (!prefs.soundOn) {
      ringRef.current = null;
      return;
    }
    const stop = startRinging(urgent ? prefs.urgentTone : prefs.normalTone, {
      volume: prefs.volume,
      cycles: urgent ? undefined : NORMAL_RINGS,
    });
    ringRef.current = { stop, urgent };
  }, [alerts, silenced]);

  useEffect(
    () => () => {
      ringRef.current?.stop();
    },
    []
  );

  // Tell the owner when the browser is holding the sound back.
  const hasAlerts = alerts.length > 0;
  useEffect(() => {
    if (!hasAlerts) return;
    const check = () => setAudioBlocked(isAudioBlocked());
    const first = setTimeout(check, 300);
    const interval = setInterval(check, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [hasAlerts]);

  function handleSilence() {
    setSilenced((prev) => Array.from(new Set([...prev, ...alerts.map((a) => a.id)])));
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => [...prev, id]);
    markAllNotificationsRead([id]);
  }

  function handleView(id: string) {
    handleDismiss(id);
    onOpenBooking();
  }

  if (alerts.length === 0) return null;

  const visible = alerts.slice(0, MAX_VISIBLE);
  const hidden = alerts.length - visible.length;
  const ringingNow = alerts.some((a) => !silenced.includes(a.id));

  return (
    <div
      aria-live="assertive"
      className="fixed inset-x-4 top-4 z-[2000] flex flex-col gap-3 sm:left-auto sm:right-4 sm:w-[380px]"
    >
      {visible.map((alert) => (
        <BookingAlertCard
          key={alert.id}
          urgent={alert.urgent}
          clientName={alert.info.client_name}
          service={alert.info.service_type}
          address={alert.info.service_address}
          preferredDate={alert.info.preferred_date}
          preferredTime={alert.info.preferred_time}
          requestedAt={alert.info.created_at}
          ringing={!silenced.includes(alert.id)}
          onSilence={handleSilence}
          onView={() => handleView(alert.id)}
          onDismiss={() => handleDismiss(alert.id)}
        />
      ))}
      {hidden > 0 && (
        <p className="rounded-full bg-slate-900 px-4 py-2 text-center text-xs font-semibold text-white shadow-lg">
          +{hidden} more booking {hidden === 1 ? "request" : "requests"} waiting
        </p>
      )}
      {audioBlocked && ringingNow && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700 shadow-lg">
          Your browser is holding the ring back — click anywhere on this page to turn the sound on.
        </p>
      )}
    </div>
  );
}
