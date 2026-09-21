"use client";

import { LogOut, Mail, Phone, Store } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import type { StaffContext } from "@/lib/tech/staffContext";

export default function TechProfileScreen({
  shop,
  staffContext,
  onSignedOut,
}: {
  shop: Shop;
  staffContext: StaffContext;
  onSignedOut: () => void;
}) {
  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  const initial = staffContext.fullName.slice(0, 1).toUpperCase() || "?";

  return (
    <main className="min-h-screen bg-brand-navy px-5 pb-24 pt-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-bold text-white">Profile</h1>

        <div className="mt-5 flex flex-col items-center rounded-2xl bg-white/5 p-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange text-xl font-bold text-white">
            {initial}
          </span>
          <p className="mt-3 text-lg font-bold text-white">{staffContext.fullName}</p>
          <span className="mt-1 inline-flex rounded-full bg-brand-blue/15 px-2.5 py-1 text-[10px] font-bold text-brand-blue">
            {staffContext.role}
          </span>
        </div>

        <div className="mt-5 space-y-1 rounded-2xl bg-white/5 p-2">
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Store className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate text-sm text-slate-300">{shop.shop_name}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate text-sm text-slate-300">{staffContext.email}</span>
          </div>
          {staffContext.phone && (
            <div className="flex items-center gap-3 rounded-xl px-3 py-3">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-sm text-slate-300">{staffContext.phone}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-red-500/30 px-6 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </main>
  );
}
