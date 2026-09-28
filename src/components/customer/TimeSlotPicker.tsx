"use client";

import { useEffect, useMemo, useState } from "react";
import { getSlotAvailability, type SlotAvailability } from "@/lib/customer/bookings";
import { formatDayLong, formatTimeOfDay, slotTimes, toIsoDate } from "@/lib/customer/slots";

/**
 * "Pick a time" for a scheduled request: every hour of the shop's day as a button —
 * open ones can be chosen, ones already held by another request are crossed out —
 * and a way to move on to the next open day when nothing suits.
 */
export default function TimeSlotPicker({
  shopSlug,
  date,
  hoursOpen,
  hoursClose,
  value,
  onChange,
  onNextDay,
  refreshKey = 0,
}: {
  shopSlug: string;
  date: string;
  hoursOpen: string | null;
  hoursClose: string | null;
  value: string;
  onChange: (time: string) => void;
  /** Moves the booking to the next day the shop works; null when there isn't one inside the booking window. */
  onNextDay: (() => void) | null;
  /** Bump to re-check availability (e.g. after the shop reported a slot was just taken). */
  refreshKey?: number;
}) {
  // Kept with the date it answers, so switching days never shows the old day's answer.
  const [loaded, setLoaded] = useState<{ date: string; rows: SlotAvailability[] | null } | null>(null);

  useEffect(() => {
    let active = true;
    getSlotAvailability(shopSlug, date)
      .then((rows) => {
        if (active) setLoaded({ date, rows });
      })
      .catch(() => {
        // Availability is a helper, never a blocker: without it every time is offered
        // and the shop confirms afterwards.
        if (active) setLoaded({ date, rows: null });
      });
    return () => {
      active = false;
    };
  }, [shopSlug, date, refreshKey]);

  const rows = loaded && loaded.date === date ? loaded.rows : undefined;
  const loading = rows === undefined;
  const times = useMemo(() => slotTimes(hoursOpen, hoursClose), [hoursOpen, hoursClose]);
  const hasHours = Boolean(hoursOpen && hoursClose);

  const nowIso = toIsoDate(new Date());
  const currentHour = new Date().getHours();

  const slots = times.map((time) => {
    const row = rows?.find((r) => r.slot === time);
    const taken = row ? row.booked_count >= row.capacity : false;
    const passed = date === nowIso && Number(time.slice(0, 2)) <= currentHour;
    return { time, taken, passed, vacant: !taken && !passed };
  });
  const anyVacant = slots.some((slot) => slot.vacant);
  const closedThatDay = rows ? rows[0]?.is_business_day === false : false;

  // A time that turned out to be taken (or no longer exists on this day) can't stay selected.
  const selectedStillOpen = !value || slots.some((slot) => slot.time === value && slot.vacant);
  useEffect(() => {
    if (!loading && !selectedStillOpen) onChange("");
  }, [loading, selectedStillOpen, onChange]);

  return (
    <div className="mt-3 rounded-xl bg-white/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Pick a time · {formatDayLong(date)}
      </p>

      {loading ? (
        <p className="mt-2 text-xs text-slate-400">Checking which times are open...</p>
      ) : (
        <>
          {!hasHours && (
            <p className="mt-2 text-[11px] text-slate-500">
              This business hasn&apos;t set its working hours yet, so usual daytime hours are shown. They&apos;ll
              confirm your request.
            </p>
          )}
          {closedThatDay && (
            <p className="mt-2 text-[11px] text-amber-400">
              The business doesn&apos;t usually work this day — they may still fit you in.
            </p>
          )}

          <div className="mt-2 grid grid-cols-3 gap-2">
            {slots.map((slot) => {
              const selected = slot.time === value;
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.vacant}
                  onClick={() => onChange(slot.time)}
                  aria-pressed={selected}
                  className={`rounded-lg px-2 py-2.5 text-center text-xs font-semibold transition-colors ${
                    selected
                      ? "bg-brand-blue text-white"
                      : slot.vacant
                        ? "bg-white/5 text-slate-200 hover:bg-brand-blue/15"
                        : "text-slate-600"
                  }`}
                >
                  <span className={slot.vacant ? "" : "line-through"}>{formatTimeOfDay(slot.time)}</span>
                  {slot.taken && <span className="block text-[9px] font-medium">Taken</span>}
                </button>
              );
            })}
          </div>

          {!anyVacant && (
            <p className="mt-3 text-xs text-amber-400">
              {slots.some((slot) => slot.taken)
                ? "Every time is taken on this day."
                : "No times are left today."}
            </p>
          )}

          {onNextDay && (
            <button
              type="button"
              onClick={onNextDay}
              className="mt-3 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark"
            >
              {anyVacant ? "Nothing that suits? Try the next day →" : "Try the next day →"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
