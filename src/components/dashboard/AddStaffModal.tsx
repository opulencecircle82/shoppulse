"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { StaffMember } from "@/lib/supabase/types";

const FREE_TECH_SEATS = 1;

export default function AddStaffModal({
  staff,
  defaultHourlyRate,
  onClose,
  onCreated,
}: {
  staff: StaffMember[];
  defaultHourlyRate: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const seatsUsed = staff.filter((s) => s.role !== "OWNER").length;
  const isPaidSeat = seatsUsed >= FREE_TECH_SEATS;

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [hourlyRate, setHourlyRate] = useState(defaultHourlyRate);
  const [acknowledgedPaidSeat, setAcknowledgedPaidSeat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLogin, setCreatedLogin] = useState<{
    username: string;
    password: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      setError("Your session expired. Please log in again.");
      return;
    }

    const response = await fetch("/api/staff/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        username,
        fullName,
        email,
        phone,
        password,
        hourlyRate,
      }),
    });

    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(result.error ?? "Failed to add staff.");
      return;
    }

    onCreated();
    setCreatedLogin({ username, password });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-brand-navy p-6 shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white">
            {createdLogin ? "Staff Added" : "Add Staff"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {createdLogin ? (
          <div className="mt-4">
            <p className="text-sm text-slate-300">
              Give these to the technician — this password won&apos;t be
              shown again, so copy it now.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">Username</p>
                <p className="mt-0.5 font-mono text-sm text-white">
                  {createdLogin.username}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">Password</p>
                <p className="mt-0.5 font-mono text-sm text-white">
                  {createdLogin.password}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(
                  `Username: ${createdLogin.username}\nPassword: ${createdLogin.password}`
                )
              }
              className="mt-4 w-full rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              Copy to Clipboard
            </button>

            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5">
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
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Username
              </label>
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Mobile App Password
              </label>
              <input
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </div>
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
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
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
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
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
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
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
            className="w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add Staff"}
          </button>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
