"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";

export default function GeofencePanel({
  shop,
  onSaved,
  showContinue = false,
  onContinue,
}: {
  shop: Shop | null;
  onSaved: () => void;
  showContinue?: boolean;
  onContinue?: () => void;
}) {
  const [radius, setRadius] = useState(shop?.geofence_radius_meters ?? 150);
  const [graceMinutes, setGraceMinutes] = useState(
    shop?.shift_grace_minutes ?? 10
  );
  const [lunchMinutes, setLunchMinutes] = useState(
    shop?.lunch_break_minutes ?? 30
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!shop) {
    return (
      <p className="text-sm text-slate-500">
        Set up your Company Profile first to configure geofencing.
      </p>
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
        geofence_radius_meters: radius,
        shift_grace_minutes: graceMinutes,
        lunch_break_minutes: lunchMinutes,
      })
      .eq("id", shop!.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    onSaved();

    if (showContinue) {
      onContinue?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-600">
            Clock-In Geofence Radius
          </label>
          <span className="text-sm font-semibold text-brand-blue">
            {radius}m
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="mt-2 w-full accent-brand-blue"
        />
        <p className="mt-1 text-xs text-slate-400">
          Technicians must be within this distance of the job site to clock
          in or out.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Shift Grace Period (minutes)
        </label>
        <input
          type="number"
          min={0}
          max={120}
          value={graceMinutes}
          onChange={(e) => setGraceMinutes(Number(e.target.value))}
          className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">
          Allowed buffer before an early checkout is flagged as unverified.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Lunch Break Deduction (minutes)
        </label>
        <input
          type="number"
          min={0}
          max={120}
          value={lunchMinutes}
          onChange={(e) => setLunchMinutes(Number(e.target.value))}
          className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">
          Automatically deducted from actual hours on every job ticket.
        </p>
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
        className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : showContinue ? "Save & Continue →" : "Save Changes"}
      </button>
    </form>
  );
}
