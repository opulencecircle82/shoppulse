"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { StaffMember } from "@/lib/supabase/types";

const FREE_TECH_SEATS = 1;

export default function AddStaffModal({
  shopId,
  staff,
  onClose,
  onCreated,
}: {
  shopId: string;
  staff: StaffMember[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const seatsUsed = staff.filter((s) => s.role !== "OWNER").length;
  const isPaidSeat = seatsUsed >= FREE_TECH_SEATS;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState(20);
  const [acknowledgedPaidSeat, setAcknowledgedPaidSeat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("staff_members").insert({
      shop_id: shopId,
      full_name: fullName,
      email,
      phone: phone || null,
      hourly_rate: hourlyRate,
      role: "TECHNICIAN",
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-brand-slate p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white">Add Staff</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-brand-slate-light/40 px-4 py-2.5">
          <span className="text-xs text-slate-400">Free Tech Seats</span>
          <span
            className={`text-xs font-semibold ${
              isPaidSeat ? "text-amber-400" : "text-brand-emerald"
            }`}
          >
            {Math.min(seatsUsed, FREE_TECH_SEATS)}/{FREE_TECH_SEATS} Free Tech Seat Used
          </span>
        </div>

        {isPaidSeat && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            You&apos;ve used your free tech seat. Adding this technician adds a{" "}
            <strong>$29 one-time activation + $25/mo</strong> additional seat
            charge to your subscription.
            <label className="mt-2 flex items-center gap-2 text-xs text-amber-200">
              <input
                type="checkbox"
                checked={acknowledgedPaidSeat}
                onChange={(e) => setAcknowledgedPaidSeat(e.target.checked)}
                className="accent-amber-400"
              />
              I understand this adds a paid seat.
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:border-brand-emerald focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:border-brand-emerald focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:border-brand-emerald focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400">
              Base Hourly Rate ($/hr)
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              required
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:border-brand-emerald focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || (isPaidSeat && !acknowledgedPaidSeat)}
            className="w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add Staff"}
          </button>
        </form>
      </div>
    </div>
  );
}
