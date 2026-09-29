"use client";

import { Building2 } from "lucide-react";
import type { Branch } from "@/lib/supabase/types";
import type { BranchFilterValue } from "@/lib/dashboard/branchFilter";

/**
 * Owner-only — filters the job board, live map, and new-ticket technician list down to one location.
 * A branch manager or technician never sees this; RLS already scopes their whole dashboard to their own
 * branch, so a switcher would have nothing else to offer them.
 */
export default function BranchSwitcher({
  branches,
  value,
  onChange,
}: {
  branches: Branch[];
  value: BranchFilterValue;
  onChange: (value: BranchFilterValue) => void;
}) {
  if (branches.length === 0) return null;

  return (
    <label className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700">
      <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter by branch"
        className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none [color-scheme:light]"
      >
        <option value="ALL">All Branches</option>
        <option value="MAIN">Main Branch</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
