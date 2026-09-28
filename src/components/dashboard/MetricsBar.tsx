"use client";

import { useMemo } from "react";
import { PiggyBank, Users, ClipboardCheck, TrendingUp } from "lucide-react";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";

export default function MetricsBar({
  tickets,
  staff,
  currency,
  onOpenPendingApprovals,
}: {
  tickets: JobTicket[];
  staff: StaffMember[];
  currency: string;
  onOpenPendingApprovals?: () => void;
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
      iconBg: "bg-brand-emerald",
      icon: PiggyBank,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: "Active Field Staff",
      value: metrics.activeFieldStaff.toString(),
      iconBg: "bg-brand-blue",
      icon: Users,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: "Pending Job Approvals",
      value: metrics.pendingApprovals.toString(),
      iconBg: "bg-amber-500",
      icon: ClipboardCheck,
      onClick: onOpenPendingApprovals,
    },
    {
      label: "Total Revenue",
      value: `${currency} ${metrics.totalRevenue.toFixed(2)}`,
      iconBg: "bg-brand-orange",
      icon: TrendingUp,
      onClick: undefined as (() => void) | undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const Wrapper = card.onClick ? "button" : "div";
        return (
          <Wrapper
            key={card.label}
            type={card.onClick ? "button" : undefined}
            onClick={card.onClick}
            className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-5 text-left shadow-sm shadow-slate-900/5 transition-shadow hover:shadow-md ${
              card.onClick ? "cursor-pointer" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-1 truncate text-2xl font-bold text-slate-900">
                {card.value}
              </p>
              {card.onClick && metrics.pendingApprovals > 0 && (
                <p className="mt-1 text-[11px] font-medium text-amber-600">
                  Click to review →
                </p>
              )}
            </div>
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md shadow-slate-900/10 ${card.iconBg}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
