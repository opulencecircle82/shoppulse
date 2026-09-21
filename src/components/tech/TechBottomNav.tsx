"use client";

import { ClipboardList, Navigation, History, User } from "lucide-react";

export type TechTab = "jobs" | "route" | "history" | "profile";

const TABS: { id: TechTab; label: string; icon: typeof ClipboardList }[] = [
  { id: "jobs", label: "Jobs", icon: ClipboardList },
  { id: "route", label: "Route", icon: Navigation },
  { id: "history", label: "History", icon: History },
  { id: "profile", label: "Profile", icon: User },
];

export default function TechBottomNav({
  active,
  onSelect,
}: {
  active: TechTab;
  onSelect: (tab: TechTab) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="flex min-w-16 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5"
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-brand-orange" : "text-slate-500"}`}
              />
              <span
                className={`text-[10px] font-semibold ${isActive ? "text-brand-orange" : "text-slate-500"}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
