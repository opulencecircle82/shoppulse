"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";

const DAYS = [
  { id: "MON", label: "Mon" },
  { id: "TUE", label: "Tue" },
  { id: "WED", label: "Wed" },
  { id: "THU", label: "Thu" },
  { id: "FRI", label: "Fri" },
  { id: "SAT", label: "Sat" },
  { id: "SUN", label: "Sun" },
] as const;

export default function WorkingHoursPanel({
  shop,
  onSaved,
}: {
  shop: Shop | null;
  onSaved: () => void;
}) {
  const [openTime, setOpenTime] = useState(shop?.business_hours_open ?? "08:00");
  const [closeTime, setCloseTime] = useState(shop?.business_hours_close ?? "17:00");
  const [days, setDays] = useState<string[]>(
    shop?.business_days ?? ["MON", "TUE", "WED", "THU", "FRI"]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!shop) {
    return (
      <p className="text-sm text-slate-500">
        Set up your Company Profile first to configure working hours.
      </p>
    );
  }

  function toggleDay(dayId: string) {
    setDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("shops")
      .update({
        business_hours_open: openTime,
        business_hours_close: closeTime,
        business_days: days,
      })
      .eq("id", shop!.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-600">
          Operating Days
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => toggleDay(day.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                days.includes(day.id)
                  ? "bg-brand-blue text-white"
                  : "bg-brand-slate text-slate-500 hover:text-slate-900"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Customers see &quot;Open Now&quot; on your listing only on these
          days, within the hours below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <div>
          <label className="block text-sm font-medium text-slate-600">
            Opens At
          </label>
          <input
            type="time"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">
            Closes At
          </label>
          <input
            type="time"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
