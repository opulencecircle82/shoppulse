"use client";

import Link from "next/link";
import {
  KanbanSquare,
  MapPin,
  ShieldCheck,
  Users,
  Megaphone,
  Smartphone,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const DASHBOARD_TABS = [
  { id: "board", label: "Job Board", icon: KanbanSquare },
  { id: "map", label: "Live Field Map", icon: MapPin },
  { id: "proof", label: "Proof & Dispute Gate", icon: ShieldCheck },
  { id: "staff", label: "Staff Management", icon: Users },
  { id: "services", label: "Services", icon: Wrench },
  { id: "ads", label: "Promotions", icon: Megaphone },
  { id: "mobile", label: "Customize Mobile App", icon: Smartphone },
] as const;

export type DashboardTabId = (typeof DASHBOARD_TABS)[number]["id"];

export default function DashboardSidebarNav({
  activeTab,
  onSelectTab,
}: {
  activeTab: DashboardTabId;
  onSelectTab: (tab: DashboardTabId) => void;
}) {
  return (
    <nav className="hidden w-56 shrink-0 lg:block">
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Menu
      </p>
      <div className="mt-3 space-y-1">
        {DASHBOARD_TABS.map((tab) => {
          const Icon: LucideIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-blue/15 text-brand-blue"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <Link
          href="/dashboard/settings"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Business Settings
        </Link>
      </div>
    </nav>
  );
}
