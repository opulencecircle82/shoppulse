"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const { checked } = useRequireAuth();

  if (!checked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-slate">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-emerald border-t-transparent" />
      </main>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-slate px-6 text-center">
      <span className="rounded-full bg-brand-emerald/15 px-3 py-1 text-xs font-semibold text-brand-emerald">
        You&apos;re in
      </span>
      <h1 className="mt-4 text-3xl font-bold text-white">
        Owner Command Center coming soon
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Your account is set up. The full job ticketing, staff, and invoicing
        dashboard is under construction.
      </p>

      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)]"
        >
          Business Settings
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-sky hover:text-brand-sky"
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}
