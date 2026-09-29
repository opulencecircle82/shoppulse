"use client";

import { useState } from "react";
import { Building2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Branch, Shop, StaffMember } from "@/lib/supabase/types";
import { useBranches } from "@/lib/hooks/useBranches";
import { isShopOpenNow } from "@/lib/customer/bookings";
import BranchWizardModal from "./BranchWizardModal";
import EditBranchModal from "./EditBranchModal";

function BranchCard({
  branch,
  manager,
  techCount,
  onEdit,
  onToggleActive,
}: {
  branch: Branch;
  manager: StaffMember | undefined;
  techCount: number;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const open = isShopOpenNow(branch);
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-md shadow-slate-900/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{branch.name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            {branch.address}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            !branch.is_active
              ? "bg-slate-100 text-slate-500"
              : open
                ? "bg-brand-emerald/15 text-brand-emerald-dark"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {!branch.is_active ? "Deactivated" : open ? "Open Now" : "Closed"}
        </span>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm text-slate-600">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Manager</dt>
          <dd className="min-w-0 truncate font-medium text-slate-900">{manager?.full_name ?? "Unassigned"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Technicians</dt>
          <dd>{techCount}</dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onToggleActive}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-amber-400 hover:text-amber-600"
        >
          {branch.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}

/**
 * Settings → Branch Management. A shop with no branches shows an empty state and the wizard button —
 * nothing here changes how a single-location shop behaves (that's still "Main Branch", the shop's own
 * Company Profile address/hours, and never appears as a row in this list).
 */
export default function BranchManagementPanel({
  shop,
  staff,
  staffLoading,
  onStaffChanged,
}: {
  shop: Shop;
  staff: StaffMember[];
  staffLoading: boolean;
  onStaffChanged: () => void;
}) {
  const { branches, loading, refresh } = useBranches(shop.id);
  const [showWizard, setShowWizard] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(branch: Branch) {
    const { error: rpcError } = await supabase.rpc("update_branch", {
      p_branch_id: branch.id,
      p_is_active: !branch.is_active,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Branches</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Additional locations under this account, each with its own manager and staff.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          + Add New Branch
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {(loading || staffLoading) && <p className="mt-6 text-sm text-slate-500">Loading branches...</p>}

      {!loading && !staffLoading && branches.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white border border-slate-200/70 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
            <Building2 className="h-5 w-5 text-brand-blue" />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            No branches yet. Your Company Profile address counts as your Main Branch — add another location here
            once you open a second one.
          </p>
        </div>
      )}

      {!loading && !staffLoading && branches.length > 0 && (
        <div className="mt-6 space-y-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              manager={staff.find((s) => s.branch_id === branch.id && s.role === "MANAGER")}
              techCount={staff.filter((s) => s.branch_id === branch.id && s.role === "TECHNICIAN").length}
              onEdit={() => setEditingBranch(branch)}
              onToggleActive={() => toggleActive(branch)}
            />
          ))}
        </div>
      )}

      {showWizard && (
        <BranchWizardModal
          shop={shop}
          staff={staff}
          onClose={() => setShowWizard(false)}
          onDone={() => {
            refresh();
            onStaffChanged();
          }}
        />
      )}

      {editingBranch && (
        <EditBranchModal
          branch={editingBranch}
          onClose={() => setEditingBranch(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
