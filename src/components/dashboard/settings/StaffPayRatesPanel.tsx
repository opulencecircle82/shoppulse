"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop, StaffMember } from "@/lib/supabase/types";

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
    <div className="rounded-2xl bg-brand-slate p-5 shadow-md shadow-black/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {member.full_name}
          </p>
          <p className="text-xs text-slate-500">
            {member.email} &middot; {member.role}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
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
          <label className="block text-xs font-medium text-slate-500">
            Hourly Rate
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Overtime Multiplier
          </label>
          <input
            type="number"
            min={1}
            step={0.1}
            value={overtimeMultiplier}
            onChange={(e) => setOvertimeMultiplier(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
  showContinue = false,
  onContinue,
}: {
  shop: Shop | null;
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
      <p className="text-sm text-slate-500">
        Set up your Company Profile first to manage staff pay rates.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading staff...</p>;
  }

  return (
    <div className="space-y-4">
      {staff.map((member) => (
        <StaffRow key={member.id} member={member} />
      ))}

      {showContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          Continue →
        </button>
      )}
    </div>
  );
}
