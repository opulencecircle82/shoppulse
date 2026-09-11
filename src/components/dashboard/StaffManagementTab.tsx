"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { StaffMember } from "@/lib/supabase/types";
import AddStaffModal from "./AddStaffModal";

const FREE_TECH_SEATS = 1;

export default function StaffManagementTab({
  staff,
  loading,
  defaultHourlyRate,
  onChanged,
}: {
  staff: StaffMember[];
  loading: boolean;
  defaultHourlyRate: number;
  onChanged: () => void;
}) {
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const nonOwnerStaff = staff.filter((s) => s.role !== "OWNER");
  const seatsUsed = nonOwnerStaff.length;

  async function toggleActive(member: StaffMember) {
    await supabase
      .from("staff_members")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);
    onChanged();
  }

  async function deleteStaff(member: StaffMember) {
    const confirmed = window.confirm(
      `Remove ${member.full_name}? This deletes their mobile app login and can't be undone.`
    );
    if (!confirmed) return;

    setDeletingId(member.id);
    setDeleteError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setDeletingId(null);
      setDeleteError("Your session expired. Please log in again.");
      return;
    }

    const response = await fetch(`/api/staff/${member.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    setDeletingId(null);

    if (!response.ok) {
      const result = await response.json();
      setDeleteError(result.error ?? "Failed to remove staff.");
      return;
    }

    onChanged();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-2xl bg-white/5 px-5 py-3 shadow-md shadow-black/20">
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
          className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          + Add Staff
        </button>
      </div>

      {deleteError && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
          {deleteError}
        </p>
      )}

      {loading && <p className="mt-6 text-sm text-slate-400">Loading staff...</p>}

      {!loading && nonOwnerStaff.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white/5 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
            <Users className="h-5 w-5 text-brand-blue" />
          </div>
          <p className="mt-3 text-sm text-slate-400">
            No staff added yet. Use &quot;+ Add Staff&quot; to bring on your
            first technician.
          </p>
        </div>
      )}

      {!loading && nonOwnerStaff.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl shadow-md shadow-black/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Mobile App Login</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Hourly Rate</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {nonOwnerStaff.map((member) => (
                <tr key={member.id} className="hover:bg-white/10-light/20">
                  <td className="px-4 py-3 font-medium text-white">
                    {member.full_name}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {member.username ?? (
                      <span className="text-slate-500">—</span>
                    )}
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
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.role !== "OWNER" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleActive(member)}
                          className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue"
                        >
                          {member.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStaff(member)}
                          disabled={deletingId === member.id}
                          className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === member.id ? "Removing..." : "Delete"}
                        </button>
                      </div>
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
          staff={staff}
          defaultHourlyRate={defaultHourlyRate}
          onClose={() => setShowAddStaff(false)}
          onCreated={onChanged}
        />
      )}
    </div>
  );
}
