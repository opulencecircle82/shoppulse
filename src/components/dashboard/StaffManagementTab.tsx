"use client";

import { useState } from "react";
import { Users, Pencil, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";
import AddStaffModal from "./AddStaffModal";
import StaffJobHistoryModal from "./StaffJobHistoryModal";
import EditStaffModal from "./EditStaffModal";

const FREE_TECH_SEATS = 1;

export default function StaffManagementTab({
  staff,
  loading,
  defaultHourlyRate,
  tickets,
  currency,
  unlimitedSeats = false,
  onChanged,
}: {
  staff: StaffMember[];
  loading: boolean;
  defaultHourlyRate: number;
  tickets: JobTicket[];
  currency: string;
  /** A test account with unlimited technician seats. */
  unlimitedSeats?: boolean;
  onChanged: () => void;
}) {
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [historyStaff, setHistoryStaff] = useState<StaffMember | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [loggingOutId, setLoggingOutId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const nonOwnerStaff = staff.filter((s) => s.role !== "OWNER");
  const seatsUsed = nonOwnerStaff.length;

  async function toggleActive(member: StaffMember) {
    await supabase
      .from("staff_members")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);
    onChanged();
  }

  async function forceLogout(member: StaffMember) {
    const confirmed = window.confirm(
      `Sign ${member.full_name} out of the mobile app everywhere? They'll need to log back in.`
    );
    if (!confirmed) return;

    setLoggingOutId(member.id);
    setActionError(null);

    const { error } = await supabase.rpc("force_logout_staff", {
      p_staff_id: member.id,
    });

    setLoggingOutId(null);

    if (error) {
      setActionError(error.message);
    }
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

  function renderActions(member: StaffMember, align: string) {
    return (
      <div className={`flex flex-wrap gap-2 ${align}`}>
        <button
          type="button"
          onClick={() => setHistoryStaff(member)}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          View Job History
        </button>
        <button
          type="button"
          onClick={() => setEditingStaff(member)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => forceLogout(member)}
          disabled={loggingOutId === member.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-amber-400 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-3 w-3" />
          {loggingOutId === member.id ? "Logging out..." : "Force Logout"}
        </button>
        <button
          type="button"
          onClick={() => toggleActive(member)}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          {member.is_active ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          onClick={() => deleteStaff(member)}
          disabled={deletingId === member.id}
          className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deletingId === member.id ? "Removing..." : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-2xl bg-white border border-slate-200/70 px-5 py-3 shadow-md shadow-slate-900/5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Seat Usage
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              !unlimitedSeats && seatsUsed >= FREE_TECH_SEATS ? "text-amber-600" : "text-brand-emerald-dark"
            }`}
          >
            {unlimitedSeats ? (
              `Unlimited tech seats (test account) · ${seatsUsed} in use`
            ) : (
              <>
                {Math.min(seatsUsed, FREE_TECH_SEATS)}/{FREE_TECH_SEATS} Free Tech Seat Used
                {seatsUsed > FREE_TECH_SEATS && ` (+${seatsUsed - FREE_TECH_SEATS} paid)`}
              </>
            )}
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

      {(deleteError || actionError) && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
          {deleteError || actionError}
        </p>
      )}

      {loading && <p className="mt-6 text-sm text-slate-500">Loading staff...</p>}

      {!loading && nonOwnerStaff.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white border border-slate-200/70 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
            <Users className="h-5 w-5 text-brand-blue" />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            No staff added yet. Use &quot;+ Add Staff&quot; to bring on your
            first technician.
          </p>
        </div>
      )}

      {/* Phones get one card per person — a 7-column table would hide the
          action buttons off-screen to the right. */}
      {!loading && nonOwnerStaff.length > 0 && (
        <div className="mt-6 space-y-3 @3xl:hidden">
          {nonOwnerStaff.map((member) => (
            <div
              key={member.id}
              className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-md shadow-slate-900/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{member.full_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {member.role} · ${member.hourly_rate.toFixed(2)}/hr
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    member.is_active
                      ? "bg-brand-emerald/15 text-brand-emerald-dark"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {member.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm text-slate-600">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">App login</dt>
                  <dd className="min-w-0 truncate font-medium text-slate-900">
                    {member.username ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="min-w-0 truncate">{member.email}</dd>
                </div>
                {member.phone && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Phone</dt>
                    <dd>{member.phone}</dd>
                  </div>
                )}
                {member.address && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Address</dt>
                    <dd className="min-w-0 text-right">{member.address}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 border-t border-slate-100 pt-3">
                {renderActions(member, "justify-start")}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && nonOwnerStaff.length > 0 && (
        <div className="mt-6 hidden overflow-x-auto rounded-2xl shadow-md shadow-slate-900/5 @3xl:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Mobile App Login</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Hourly Rate</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {nonOwnerStaff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {member.full_name}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {member.username ?? (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    <div>{member.email}</div>
                    {member.phone && (
                      <div className="text-xs text-slate-500">{member.phone}</div>
                    )}
                    {member.address && (
                      <div className="text-xs text-slate-500">{member.address}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{member.role}</td>
                  <td className="px-3 py-3 text-slate-600">
                    ${member.hourly_rate.toFixed(2)}/hr
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        member.is_active
                          ? "bg-brand-emerald/15 text-brand-emerald-dark"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="min-w-[200px] px-3 py-3 text-right">
                    {member.role !== "OWNER" && renderActions(member, "justify-end")}
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
          unlimitedSeats={unlimitedSeats}
          onClose={() => setShowAddStaff(false)}
          onCreated={onChanged}
        />
      )}

      {historyStaff && (
        <StaffJobHistoryModal
          staffMember={historyStaff}
          tickets={tickets}
          currency={currency}
          onClose={() => setHistoryStaff(null)}
        />
      )}

      {editingStaff && (
        <EditStaffModal
          staffMember={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}
