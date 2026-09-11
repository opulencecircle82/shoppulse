"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop, StaffMember } from "@/lib/supabase/types";

function DefaultBillingRate({ shop, onSaved }: { shop: Shop; onSaved: () => void }) {
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(shop.default_hourly_rate);
  const [defaultOvertimeMultiplier, setDefaultOvertimeMultiplier] = useState(
    shop.default_overtime_multiplier
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("shops")
      .update({
        default_hourly_rate: defaultHourlyRate,
        default_overtime_multiplier: defaultOvertimeMultiplier,
      })
      .eq("id", shop.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      onSaved();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-brand-blue/20 bg-white/5 p-5 shadow-md shadow-black/20"
    >
      <p className="text-sm font-semibold text-white">Default Billing Rate</p>
      <p className="mt-1 text-xs text-slate-500">
        What you charge customers by default &mdash; used to auto-compute the
        invoice when a job is approved. Separate from each technician&apos;s
        personal pay rate below.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400">
            Hourly Rate
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={defaultHourlyRate}
            onChange={(e) => setDefaultHourlyRate(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400">
            Overtime Multiplier
          </label>
          <input
            type="number"
            min={1}
            step={0.1}
            value={defaultOvertimeMultiplier}
            onChange={(e) => setDefaultOvertimeMultiplier(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-xs text-brand-emerald">Saved</span>}
      </div>
    </form>
  );
}

function StaffRow({ member }: { member: StaffMember }) {
  const [hourlyRate, setHourlyRate] = useState(member.hourly_rate);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(
    member.overtime_multiplier
  );
  const [isActive, setIsActive] = useState(member.is_active);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("staff_members")
      .update({
        hourly_rate: hourlyRate,
        overtime_multiplier: overtimeMultiplier,
        is_active: isActive,
      })
      .eq("id", member.id);

    setSaving(false);
    if (!error) setSaved(true);
  }

  return (
    <div className="rounded-2xl bg-white/5 p-5 shadow-md shadow-black/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {member.full_name}
          </p>
          <p className="text-xs text-slate-400">
            {member.email} &middot; {member.role}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-brand-emerald"
          />
          Active
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400">
            Hourly Rate
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400">
            Overtime Multiplier
          </label>
          <input
            type="number"
            min={1}
            step={0.1}
            value={overtimeMultiplier}
            onChange={(e) => setOvertimeMultiplier(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span className="text-xs text-brand-emerald">Saved</span>
        )}
      </div>
    </div>
  );
}

export default function StaffPayRatesPanel({
  shop,
  onSaved,
  showContinue = false,
  onContinue,
}: {
  shop: Shop | null;
  onSaved?: () => void;
  showContinue?: boolean;
  onContinue?: () => void;
}) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop) {
      const id = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(id);
    }

    supabase
      .from("staff_members")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setStaff((data as StaffMember[]) ?? []);
        setLoading(false);
      });
  }, [shop]);

  if (!shop) {
    return (
      <p className="text-sm text-slate-400">
        Set up your Company Profile first to manage staff pay rates.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading staff...</p>;
  }

  return (
    <div className="space-y-4">
      <DefaultBillingRate shop={shop} onSaved={() => onSaved?.()} />

      {staff.map((member) => (
        <StaffRow key={member.id} member={member} />
      ))}

      {showContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          Continue →
        </button>
      )}
    </div>
  );
}
