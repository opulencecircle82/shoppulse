"use client";

import {
  KanbanSquare,
  MapPin,
  ShieldCheck,
  Users,
  Megaphone,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export const DASHBOARD_TABS = [
  { id: "board", label: "Job Board", icon: KanbanSquare },
  { id: "map", label: "Live Field Map", icon: MapPin },
  { id: "proof", label: "Proof & Dispute Gate", icon: ShieldCheck },
  { id: "staff", label: "Staff Management", icon: Users },
  { id: "ads", label: "Local Ad Network", icon: Megaphone },
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
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                  : "text-slate-500 hover:bg-brand-slate-light/40 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
