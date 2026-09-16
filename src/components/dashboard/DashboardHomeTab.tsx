"use client";

import Link from "next/link";
import { Globe, Settings, type LucideIcon } from "lucide-react";
import { DASHBOARD_TABS, type DashboardTabId } from "./DashboardSidebarNav";

export default function DashboardHomeTab({
  onSelectTab,
  unreadMessages,
}: {
  onSelectTab: (tab: DashboardTabId) => void;
  unreadMessages: number;
}) {
  const tiles = DASHBOARD_TABS.filter((tab) => tab.id !== "home");

  return (
    <div className="mt-6 space-y-6">
      <Link
        href="/dashboard/website"
        className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-brand-orange/30 bg-gradient-to-r from-brand-orange/15 to-amber-500/10 p-5 transition-colors hover:from-brand-orange/25 hover:to-amber-500/20"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-orange text-white">
          <Globe className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-white">Your Website</p>
          <p className="text-sm text-slate-300">
            Click here to customize your website
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tab) => {
          const Icon: LucideIcon = tab.icon;
          const hasUnread = tab.id === "messages" && unreadMessages > 0;

          const tileContent = (
            <>
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
            </>
          );

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className="relative flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition-colors hover:border-white/20 hover:bg-white/10"
            >
              {tileContent}
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
