"use client";

import Link from "next/link";
import type { JobTicket } from "@/lib/supabase/types";
import type { Customer } from "@/lib/customer/customerAuth";
import { signOutCustomer } from "@/lib/customer/customerAuth";

const STATUS_STYLES: Record<string, string> = {
  UNASSIGNED: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-blue-50 text-brand-blue",
  IN_PROGRESS: "bg-amber-50 text-amber-600",
  COMPLETED: "bg-blue-50 text-brand-blue",
  APPROVED: "bg-emerald-50 text-emerald-600",
  DISPUTED: "bg-red-50 text-red-600",
};

export default function CustomerHomeScreen({
  customer,
  jobs,
  onSignedOut,
}: {
  customer: Customer;
  jobs: JobTicket[];
  onSignedOut: () => void;
}) {
  async function handleSignOut() {
    await signOutCustomer();
    onSignedOut();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <div className="mx-auto max-w-lg">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-slate-900">Hi, {customer.fullName}</p>
            <p className="text-xs text-slate-500">Your ShopPulse jobs</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Sign Out
          </button>
        </header>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Your Jobs
        </p>

        {jobs.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white p-6 text-center shadow-sm shadow-slate-900/5">
            <p className="text-sm text-slate-500">
              No jobs yet. Ask your service provider for their booking link to
              request one.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/client/${job.id}`}
                  className="block rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 transition-shadow hover:shadow-md"
                >
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      STATUS_STYLES[job.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {job.status.replace("_", " ")}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {job.service_type}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{job.service_address}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
