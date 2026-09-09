"use client";

import { useMemo } from "react";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";

export default function MetricsBar({
  tickets,
  staff,
  currency,
}: {
  tickets: JobTicket[];
  staff: StaffMember[];
  currency: string;
}) {
  const metrics = useMemo(() => {
    const wastedDollarsSaved = tickets.reduce((sum, ticket) => {
      if (!ticket.actual_hours || ticket.actual_hours >= ticket.estimated_hours) {
        return sum;
      }
      const assignedStaff = staff.find((s) => s.id === ticket.assigned_staff_id);
      const rate = assignedStaff?.hourly_rate ?? 0;
      return sum + (ticket.estimated_hours - ticket.actual_hours) * rate;
    }, 0);

    const activeFieldStaff = staff.filter(
      (s) => s.is_active && s.role === "TECHNICIAN"
    ).length;

    const pendingApprovals = tickets.filter(
      (t) => t.status === "COMPLETED"
    ).length;

    const totalRevenue = tickets
      .filter((t) => t.status === "APPROVED")
      .reduce((sum, t) => sum + (t.total_invoice_amount ?? 0), 0);

    return { wastedDollarsSaved, activeFieldStaff, pendingApprovals, totalRevenue };
  }, [tickets, staff]);

  const cards = [
    {
      label: "Wasted Dollars Saved",
      value: `${currency} ${metrics.wastedDollarsSaved.toFixed(2)}`,
      accent: "text-brand-emerald",
    },
    {
      label: "Active Field Staff",
      value: metrics.activeFieldStaff.toString(),
      accent: "text-brand-sky",
    },
    {
      label: "Pending Job Approvals",
      value: metrics.pendingApprovals.toString(),
      accent: "text-amber-400",
    },
    {
      label: "Total Revenue",
      value: `${currency} ${metrics.totalRevenue.toFixed(2)}`,
      accent: "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl bg-brand-slate-light/40 p-5 shadow-md shadow-black/20"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {card.label}
          </p>
          <p className={`mt-2 text-2xl font-bold ${card.accent}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
