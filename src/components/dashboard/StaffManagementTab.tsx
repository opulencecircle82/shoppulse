"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { StaffMember } from "@/lib/supabase/types";
import AddStaffModal from "./AddStaffModal";

const FREE_TECH_SEATS = 1;

export default function StaffManagementTab({
  shopId,
  staff,
  loading,
  onChanged,
}: {
  shopId: string;
  staff: StaffMember[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [showAddStaff, setShowAddStaff] = useState(false);
  const seatsUsed = staff.filter((s) => s.role !== "OWNER").length;

  async function toggleActive(member: StaffMember) {
    await supabase
      .from("staff_members")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);
    onChanged();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-xl border border-slate-700 bg-brand-slate-light/30 px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Seat Usage
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              seatsUsed >= FREE_TECH_SEATS ? "text-amber-400" : "text-brand-emerald"
            }`}
          >
            {Math.min(seatsUsed, FREE_TECH_SEATS)}/{FREE_TECH_SEATS} Free Tech Seat Used
            {seatsUsed > FREE_TECH_SEATS &&
              ` (+${seatsUsed - FREE_TECH_SEATS} paid)`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddStaff(true)}
          className="rounded-full bg-brand-emerald px-5 py-2.5 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)]"
        >
          + Add Staff
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-400">Loading staff...</p>}

      {!loading && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-slate-light/40 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Hourly Rate</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-brand-slate-light/20">
                  <td className="px-4 py-3 font-medium text-white">
                    {member.full_name}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{member.email}</div>
                    {member.phone && (
                      <div className="text-xs text-slate-500">{member.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{member.role}</td>
                  <td className="px-4 py-3 text-slate-300">
                    ${member.hourly_rate.toFixed(2)}/hr
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        member.is_active
                          ? "bg-brand-emerald/15 text-brand-emerald"
                          : "bg-slate-700/50 text-slate-400"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.role !== "OWNER" && (
                      <button
                        type="button"
                        onClick={() => toggleActive(member)}
                        className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-brand-sky hover:text-brand-sky"
                      >
                        {member.is_active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddStaff && (
        <AddStaffModal
          shopId={shopId}
          staff={staff}
          onClose={() => setShowAddStaff(false)}
          onCreated={onChanged}
        />
      )}
    </div>
  );
}
