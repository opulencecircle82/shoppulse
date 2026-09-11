"use client";

import { useMemo } from "react";
import { PiggyBank, Users, ClipboardCheck, TrendingUp } from "lucide-react";
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
      iconBg: "bg-brand-emerald/15",
      cardBg: "bg-gradient-to-br from-emerald-500/10 to-white/5",
      borderAccent: "border-t-emerald-400",
      icon: PiggyBank,
    },
    {
      label: "Active Field Staff",
      value: metrics.activeFieldStaff.toString(),
      accent: "text-brand-blue",
      iconBg: "bg-brand-blue/15",
      cardBg: "bg-gradient-to-br from-blue-500/10 to-white/5",
      borderAccent: "border-t-brand-blue",
      icon: Users,
    },
    {
      label: "Pending Job Approvals",
      value: metrics.pendingApprovals.toString(),
      accent: "text-amber-500",
      iconBg: "bg-amber-400/15",
      cardBg: "bg-gradient-to-br from-amber-500/10 to-white/5",
      borderAccent: "border-t-amber-400",
      icon: ClipboardCheck,
    },
    {
      label: "Total Revenue",
      value: `${currency} ${metrics.totalRevenue.toFixed(2)}`,
      accent: "text-white",
      iconBg: "bg-brand-orange/15",
      cardBg: "bg-gradient-to-br from-brand-orange/10 to-white/5",
      borderAccent: "border-t-brand-orange",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-2xl border border-white/10 border-t-4 ${card.borderAccent} ${card.cardBg} p-5 shadow-md shadow-black/20 transition-shadow hover:shadow-lg`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBg}`}>
              <Icon className={`h-5 w-5 ${card.accent}`} />
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              {card.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${card.accent}`}>
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
