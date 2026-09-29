"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import type { Shop, StaffMember } from "@/lib/supabase/types";
import { deviceTimeZone } from "@/lib/shopTimezone";

const LocationPickerMap = dynamic(
  () => import("@/components/shared/LocationPickerMap"),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading map...</p> }
);

const DAYS = [
  { id: "MON", label: "Mon" },
  { id: "TUE", label: "Tue" },
  { id: "WED", label: "Wed" },
  { id: "THU", label: "Thu" },
  { id: "FRI", label: "Fri" },
  { id: "SAT", label: "Sat" },
  { id: "SUN", label: "Sun" },
] as const;

const FREE_TECH_SEATS = 1;

const inputClass =
  "mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none";
const labelClass = "block text-sm font-medium text-slate-600";

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mt-4 flex gap-1.5">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            n <= step ? "bg-brand-emerald" : "bg-slate-100"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * "+ Add New Branch": (1) location & hours, (2) assign a manager — an existing staff member
 * promoted in place, or a brand-new hire — (3) assign existing staff to the new branch. Each
 * step commits as it goes (the branch already exists once step 1 finishes), so closing partway
 * through still leaves a usable branch behind rather than losing the owner's work.
 */
export default function BranchWizardModal({
  shop,
  staff,
  onClose,
  onDone,
}: {
  shop: Shop;
  staff: StaffMember[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");

  // Step 1 fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [openTime, setOpenTime] = useState(shop.business_hours_open ?? "08:00");
  const [closeTime, setCloseTime] = useState(shop.business_hours_close ?? "17:00");
  const [days, setDays] = useState<string[]>(shop.business_days ?? ["MON", "TUE", "WED", "THU", "FRI"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 fields
  const [managerMode, setManagerMode] = useState<"existing" | "new" | "skip">("skip");
  const [existingManagerId, setExistingManagerId] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [acknowledgedPaidSeat, setAcknowledgedPaidSeat] = useState(false);
  const [createdLogin, setCreatedLogin] = useState<{ username: string; password: string } | null>(null);

  // Step 3 fields
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const nonOwnerStaff = staff.filter((s) => s.role !== "OWNER");
  const seatsUsed = nonOwnerStaff.length;
  const willAddSeat = managerMode === "new";
  const isPaidSeat = willAddSeat && seatsUsed >= FREE_TECH_SEATS;

  async function handleStep1(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!address.trim()) {
      setError("Please enter this branch's address.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Please drop this branch's pin on the map.");
      return;
    }
    if (days.length === 0) {
      setError("Pick at least one working day.");
      return;
    }
    if (!openTime || !closeTime || closeTime <= openTime) {
      setError("Closing time must be after opening time.");
      return;
    }

    setSaving(true);
    const { data, error: rpcError } = await supabase.rpc("create_branch", {
      p_name: name.trim(),
      p_address: address.trim(),
      p_latitude: latitude,
      p_longitude: longitude,
      p_contact_phone: contactPhone.trim() || null,
      p_city: city.trim() || null,
      p_region: region.trim() || null,
      p_business_hours_open: openTime,
      p_business_hours_close: closeTime,
      p_business_days: days,
      p_timezone: deviceTimeZone(),
    });
    setSaving(false);

    if (rpcError || !data) {
      setError(rpcError?.message ?? "Failed to create branch.");
      return;
    }

    setBranchId(data as string);
    setBranchName(name.trim());
    setStep(2);
  }

  async function handleStep2Continue() {
    setError(null);

    if (managerMode === "skip") {
      setStep(3);
      return;
    }

    if (managerMode === "existing") {
      if (!existingManagerId) {
        setError("Choose a staff member to promote, or skip this step.");
        return;
      }
      setSaving(true);
      const { error: rpcError } = await supabase.rpc("set_staff_branch_role", {
        p_staff_id: existingManagerId,
        p_branch_id: branchId,
        p_role: "MANAGER",
      });
      setSaving(false);
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setStep(3);
      return;
    }

    // managerMode === "new"
    if (!newUsername || !newFullName || !newEmail || !newPassword) {
      setError("Fill in the new manager's name, username, email, and password.");
      return;
    }
    if (isPaidSeat && !acknowledgedPaidSeat) {
      setError("Please acknowledge the paid seat charge to continue.");
      return;
    }

    setSaving(true);
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        username: newUsername,
        fullName: newFullName,
        email: newEmail,
        phone: newPhone,
        password: newPassword,
        hourlyRate: shop.default_hourly_rate,
        role: "MANAGER",
        branchId,
      }),
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(result.error ?? "Failed to add the manager.");
      return;
    }

    setCreatedLogin({ username: newUsername, password: newPassword });
  }

  async function handleFinish() {
    setError(null);
    setSaving(true);

    for (const staffId of selectedStaffIds) {
      const { error: rpcError } = await supabase.rpc("set_staff_branch_role", {
        p_staff_id: staffId,
        p_branch_id: branchId,
      });
      if (rpcError) {
        setSaving(false);
        setError(rpcError.message);
        return;
      }
    }

    setSaving(false);
    onDone();
    onClose();
  }

  const assignableStaff = nonOwnerStaff.filter((s) => s.id !== existingManagerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 sm:px-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Add New Branch</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Step {step} of 3:{" "}
              {step === 1 ? "Branch details & location" : step === 2 ? "Assign a manager" : "Assign staff"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900" aria-label="Close">
            ✕
          </button>
        </div>
        <StepDots step={step} />

        {step === 1 && (
          <form onSubmit={handleStep1} className="mt-5 space-y-4">
            <div>
              <label className={labelClass}>Branch Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kidapawan Branch"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Contact Number</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Operating Days</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() =>
                      setDays((prev) =>
                        prev.includes(day.id) ? prev.filter((d) => d !== day.id) : [...prev, day.id]
                      )
                    }
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      days.includes(day.id) ? "bg-brand-blue text-white" : "bg-slate-50 text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Opens At</label>
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Closes At</label>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={inputClass} />
              </div>
            </div>

            <LocationPickerMap
              tone="light"
              label="Pin This Branch on the Map (required)"
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
            />

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Branch & Continue"}
            </button>
          </form>
        )}

        {step === 2 && !createdLogin && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-500">
              Who manages <strong className="text-slate-900">{branchName}</strong>? A branch manager can dispatch
              jobs, view sales, and manage staff for this branch only.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {(["existing", "new", "skip"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setManagerMode(mode)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                    managerMode === mode ? "bg-brand-blue text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {mode === "existing" ? "Existing staff" : mode === "new" ? "New hire" : "Skip for now"}
                </button>
              ))}
            </div>

            {managerMode === "existing" && (
              <div>
                <label className={labelClass}>Promote to Branch Manager</label>
                <select
                  value={existingManagerId}
                  onChange={(e) => setExistingManagerId(e.target.value)}
                  className={`${inputClass} [color-scheme:light]`}
                >
                  <option value="">Select a staff member</option>
                  {nonOwnerStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.role})
                    </option>
                  ))}
                </select>
                {nonOwnerStaff.length === 0 && (
                  <p className="mt-1.5 text-xs text-slate-500">No existing staff yet — try &quot;New hire&quot; instead.</p>
                )}
              </div>
            )}

            {managerMode === "new" && (
              <>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
                  <span className="text-xs text-slate-500">Free Tech Seats</span>
                  <span className={`text-xs font-semibold ${isPaidSeat ? "text-amber-600" : "text-brand-emerald-dark"}`}>
                    {shop.unlimited_tech_seats
                      ? "Unlimited (test account)"
                      : `${Math.min(seatsUsed, FREE_TECH_SEATS)}/${FREE_TECH_SEATS} Free Tech Seat Used`}
                  </span>
                </div>
                {isPaidSeat && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
                    You&apos;ve used your free tech seat. Adding this manager adds a <strong>$29 one-time activation + $25/mo</strong> additional seat charge to your subscription.
                    <label className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                      <input
                        type="checkbox"
                        checked={acknowledgedPaidSeat}
                        onChange={(e) => setAcknowledgedPaidSeat(e.target.checked)}
                        className="accent-amber-500"
                      />
                      I understand this adds a paid seat.
                    </label>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Username</label>
                    <input
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.trim())}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile App Password</label>
                    <input
                      type="text"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleStep2Continue}
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {step === 2 && createdLogin && (
          <div className="mt-5">
            <p className="text-sm text-slate-600">
              Give these to the new manager — this password won&apos;t be shown again, so copy it now.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Username</p>
                <p className="mt-0.5 font-mono text-sm text-slate-900">{createdLogin.username}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Password</p>
                <p className="mt-0.5 font-mono text-sm text-slate-900">{createdLogin.password}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-500">
              Move any existing technicians to <strong className="text-slate-900">{branchName}</strong> now, or skip
              and do it later from the staff list.
            </p>

            {assignableStaff.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">No other staff to assign yet.</p>
            )}

            {assignableStaff.length > 0 && (
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {assignableStaff.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                  >
                    <span className="text-sm text-slate-900">
                      {s.full_name} <span className="text-xs text-slate-500">({s.role})</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(s.id)}
                      onChange={(e) =>
                        setSelectedStaffIds((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                        )
                      }
                      className="accent-brand-blue"
                    />
                  </label>
                ))}
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Finishing..." : "Finish"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
