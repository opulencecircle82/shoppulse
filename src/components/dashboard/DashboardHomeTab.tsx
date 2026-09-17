"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
} from "recharts";
import {
  Settings,
  Calendar,
  TrendingUp,
  TrendingDown,
  Megaphone,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import type { JobTicket, JobStatus, Shop, StaffMember } from "@/lib/supabase/types";
import { DASHBOARD_TABS, type DashboardTabId } from "./DashboardSidebarNav";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const STATUS_GROUPS: { label: string; color: string; statuses: JobStatus[] }[] = [
  { label: "Needs Attention", color: "#F97316", statuses: ["PENDING", "UNASSIGNED", "DISPUTED"] },
  { label: "In Progress", color: "#2563EB", statuses: ["SCHEDULED", "IN_PROGRESS"] },
  { label: "Completed", color: "#10B981", statuses: ["COMPLETED", "APPROVED"] },
];

const UPCOMING_EXCLUDED_STATUSES = new Set<JobStatus>([
  "COMPLETED",
  "APPROVED",
  "REJECTED",
  "DISPUTED",
]);

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export default function DashboardHomeTab({
  ownerName,
  shop,
  tickets,
  staff,
  currency,
  onSelectTab,
  unreadMessages,
}: {
  ownerName: string;
  shop: Shop;
  tickets: JobTicket[];
  staff: StaffMember[];
  currency: string;
  onSelectTab: (tab: DashboardTabId) => void;
  unreadMessages: number;
}) {
  const firstName = ownerName.trim().split(" ")[0] || ownerName;
  const [linkCopied, setLinkCopied] = useState(false);

  const siteUrl =
    typeof window !== "undefined" ? `${window.location.origin}/site/${shop.slug}` : "";

  function copyLink() {
    navigator.clipboard.writeText(siteUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const activeStaffList = useMemo(
    () => staff.filter((s) => s.is_active && s.role !== "OWNER"),
    [staff]
  );
  const onDutyStaffIds = useMemo(
    () =>
      new Set(
        tickets
          .filter((t) => t.status === "IN_PROGRESS" && t.assigned_staff_id)
          .map((t) => t.assigned_staff_id as string)
      ),
    [tickets]
  );

  const pipelineData = useMemo(() => {
    return STATUS_GROUPS.map((group) => ({
      name: group.label,
      value: tickets.filter((t) => group.statuses.includes(t.status)).length,
      color: group.color,
    })).filter((d) => d.value > 0);
  }, [tickets]);

  const totalActiveJobs = pipelineData.reduce((sum, d) => sum + d.value, 0);

  // "Revenue" only ever counts APPROVED tickets, matching MetricsBar's
  // Total Revenue definition — an invoice isn't real revenue until approved.
  const revenue = useMemo(() => {
    const now = new Date();
    const thisKey = monthKey(now);
    const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    let thisMonth = 0;
    let lastMonth = 0;
    for (const t of tickets) {
      if (t.status !== "APPROVED") continue;
      const key = monthKey(new Date(t.completed_at ?? t.created_at));
      if (key === thisKey) thisMonth += t.total_invoice_amount;
      else if (key === lastKey) lastMonth += t.total_invoice_amount;
    }

    const changePct =
      lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;
    return { thisMonth, changePct };
  }, [tickets]);

  const trendData = useMemo(() => {
    const days: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), label: `${d.getMonth() + 1}/${d.getDate()}` });
    }
    const totals = new Map(days.map((d) => [d.key, 0]));
    for (const t of tickets) {
      if (t.status !== "APPROVED") continue;
      const key = (t.completed_at ?? t.created_at).slice(0, 10);
      if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + t.total_invoice_amount);
    }
    return days.map((d) => ({ day: d.label, revenue: totals.get(d.key) ?? 0 }));
  }, [tickets]);

  const upcomingJobs = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return tickets
      .filter(
        (t) =>
          t.preferred_date &&
          t.preferred_date >= todayStr &&
          !UPCOMING_EXCLUDED_STATUSES.has(t.status)
      )
      .sort((a, b) => (a.preferred_date ?? "").localeCompare(b.preferred_date ?? ""))
      .slice(0, 5);
  }, [tickets]);

  // Reminder list — jobs scheduled exactly 1 day from now, so an owner
  // sees them here the day before (e.g. scheduled for Saturday shows up
  // on Friday), not just buried in the general Pending Jobs list below.
  const tomorrowJobs = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    return tickets
      .filter(
        (t) =>
          t.preferred_date?.slice(0, 10) === tomorrowStr &&
          !UPCOMING_EXCLUDED_STATUSES.has(t.status)
      )
      .sort((a, b) => (a.preferred_date ?? "").localeCompare(b.preferred_date ?? ""));
  }, [tickets]);

  const tiles = DASHBOARD_TABS.filter((tab) => tab.id !== "home");

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Welcome back, {firstName}!</h2>
        <p className="mt-1 text-sm text-slate-400">Here&apos;s how your business is doing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Your Website Preview</p>
            <Link
              href="/dashboard/website"
              className="text-xs font-semibold text-brand-blue hover:text-blue-400"
            >
              Customize →
            </Link>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white">
            <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="ml-2 truncate text-[10px] text-slate-500">{siteUrl}</span>
            </div>
            {/* The real /site/[slug] page, not a mockup. */}
            <iframe
              src={`/site/${shop.slug}`}
              title="Your website preview"
              className="h-[320px] w-full border-0"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              {linkCopied ? "Link copied!" : "Copy Link"}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("ads")}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              <Megaphone className="h-3.5 w-3.5" />
              View Ads Preview
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Active Staff</p>
            {activeStaffList.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">No active staff yet.</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {activeStaffList.map((s) => {
                  const onDuty = onDutyStaffIds.has(s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-xs font-bold text-brand-blue">
                        {initials(s.full_name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-white">
                        {s.full_name}
                      </span>
                      {onDuty && (
                        <span className="shrink-0 rounded-full bg-brand-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-brand-emerald">
                          On Duty
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              tomorrowJobs.length > 0
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {tomorrowJobs.length > 0 && <BellRing className="h-4 w-4 text-amber-400" />}
              <p className="text-sm font-semibold text-white">Schedule — Tomorrow</p>
              {tomorrowJobs.length > 0 && (
                <span className="ml-auto shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-brand-navy">
                  {tomorrowJobs.length}
                </span>
              )}
            </div>
            {tomorrowJobs.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">
                Nothing scheduled for tomorrow yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {tomorrowJobs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTab("board")}
                    className="flex w-full items-center gap-3 rounded-xl bg-black/20 px-3 py-2.5 text-left transition-colors hover:bg-black/30"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                      <BellRing className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white">
                        {t.client_name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {t.service_type}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Pending Jobs</p>
            {upcomingJobs.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">
                No upcoming jobs scheduled.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {upcomingJobs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTab("board")}
                    className="flex w-full items-center gap-3 rounded-xl bg-black/20 px-3 py-2.5 text-left transition-colors hover:bg-black/30"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/15 text-brand-blue">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white">
                        {t.client_name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {t.service_type}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-slate-400">
                      {t.preferred_date ? new Date(t.preferred_date).toLocaleDateString() : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-white">Job Pipeline</p>
          {totalActiveJobs === 0 ? (
            <p className="mt-10 text-center text-sm text-slate-500">
              No jobs yet — create your first job ticket to see your pipeline here.
            </p>
          ) : (
            <>
              <div className="relative mx-auto mt-2 h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pipelineData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value, name) => [
                        `${value} job${value === 1 ? "" : "s"}`,
                        String(name),
                      ]}
                      contentStyle={{
                        fontSize: 12,
                        backgroundColor: "#0F172A",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-white">{totalActiveJobs}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Jobs</p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {pipelineData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-white">Revenue This Month</p>
          <p className="mt-3 text-3xl font-bold text-white">
            {currency} {revenue.thisMonth.toFixed(2)}
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${
              revenue.changePct >= 0 ? "text-brand-emerald" : "text-red-400"
            }`}
          >
            {revenue.changePct >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(revenue.changePct).toFixed(0)}% vs last month
          </p>
          <div className="mt-4 h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Last 14 days, approved invoices only</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tab) => {
          const Icon: LucideIcon = tab.icon;
          const hasUnread = tab.id === "messages" && unreadMessages > 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className="relative flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  hasUnread ? "bg-red-500/15 text-red-400" : "bg-white/10 text-brand-blue"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-white">{tab.label}</p>
              {hasUnread && (
                <span className="absolute right-3 top-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </button>
          );
        })}

        <Link
          href="/dashboard/settings"
          className="relative flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition-colors hover:border-white/20 hover:bg-white/10"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-brand-blue">
            <Settings className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-white">Business Settings</p>
        </Link>
      </div>
    </div>
  );
}
