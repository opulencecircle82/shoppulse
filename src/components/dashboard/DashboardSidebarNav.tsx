"use client";

import Link from "next/link";
import {
  Home,
  KanbanSquare,
  MapPin,
  ShieldCheck,
  Users,
  Megaphone,
  Smartphone,
  Settings,
  Wrench,
  Star,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export const DASHBOARD_TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "board", label: "Job Board", icon: KanbanSquare },
  { id: "map", label: "Live Field Map", icon: MapPin },
  { id: "proof", label: "Proof & Dispute Gate", icon: ShieldCheck },
  { id: "staff", label: "Staff Management", icon: Users },
  { id: "services", label: "Services", icon: Wrench },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "ads", label: "Promotions", icon: Megaphone },
  { id: "mobile", label: "Customize Mobile App", icon: Smartphone },
] as const;

export type DashboardTabId = (typeof DASHBOARD_TABS)[number]["id"];

export default function DashboardSidebarNav({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  bookingRequestCount = 0,
}: {
  activeTab: DashboardTabId;
  onSelectTab: (tab: DashboardTabId) => void;
  unreadCount?: number;
  bookingRequestCount?: number;
}) {
  const badgeCounts: Partial<Record<DashboardTabId, number>> = {
    messages: unreadCount,
    board: bookingRequestCount,
  };

  return (
    <nav className="hidden w-60 shrink-0 self-start lg:block">
      <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm shadow-slate-900/5">
        <p className="px-3 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Menu
        </p>
        <div className="mt-2 space-y-1">
          {DASHBOARD_TABS.map((tab) => {
            const Icon: LucideIcon = tab.icon;
            const isActive = activeTab === tab.id;
            const badgeCount = badgeCounts[tab.id] ?? 0;
            const hasUnread = badgeCount > 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                    : hasUnread
                      ? "bg-red-50 text-slate-900 hover:bg-red-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${hasUnread && !isActive ? "text-red-500" : ""}`}
                />
                {tab.label}
                {hasUnread && (
                  <span className="relative ml-auto flex h-4 min-w-4 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3">
          <Link
            href="/dashboard/settings"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Business Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}
