"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JobTicket } from "@/lib/supabase/types";
import type { Customer } from "@/lib/customer/customerAuth";
import { signOutCustomer } from "@/lib/customer/customerAuth";
import { listNearbyPromotions, type NearbyPromotion } from "@/lib/customer/bookings";
import CustomerNotificationBell from "./CustomerNotificationBell";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  REJECTED: "bg-red-50 text-red-600",
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
  const router = useRouter();
  const [shopCode, setShopCode] = useState("");
  const [promotions, setPromotions] = useState<NearbyPromotion[]>([]);

  useEffect(() => {
    let active = true;
    const id = setTimeout(() => {
      listNearbyPromotions(customer.city).then((rows) => {
        if (active) setPromotions(rows);
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [customer.city]);

  async function handleSignOut() {
    await signOutCustomer();
    onSignedOut();
  }

  function handleBookSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = shopCode.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug) return;
    router.push(`/customer/book/${slug}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <div className="mx-auto max-w-lg">
        {promotions.length > 0 && (
          <div className="-mx-5 mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
            {promotions.slice(0, 6).map((promo) => (
              <Link
                key={promo.id}
                href={`/customer/shop/${promo.shop_slug}`}
                className="relative block h-32 w-64 shrink-0 snap-start overflow-hidden rounded-2xl shadow-sm shadow-slate-900/10"
              >
                {promo.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={promo.image_url}
                    alt={promo.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-blue to-slate-900 p-4 text-center">
                    <p className="text-sm font-bold text-white">{promo.title}</p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/40 px-3 py-1.5">
                  <p className="truncate text-xs font-semibold text-white">
                    {promo.shop_name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <header className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-slate-900">Hi, {customer.fullName}</p>
            <p className="text-xs text-slate-500">Your ShopPulse jobs</p>
          </div>
          <div className="flex items-center gap-1">
            <CustomerNotificationBell customerId={customer.id} />
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold text-slate-900">Book a New Job</p>
          <p className="mt-1 text-xs text-slate-500">
            Enter the business code your service provider gave you (it&apos;s
            also the end of the booking link they shared).
          </p>
          <form onSubmit={handleBookSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. leans-electrical-service"
              value={shopCode}
              onChange={(e) => setShopCode(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/30"
            >
              Book Now
            </button>
          </form>
          <Link
            href="/customer/discover"
            className="mt-3 block text-center text-xs font-medium text-brand-blue"
          >
            Don&apos;t have a code? Browse services near you →
          </Link>
        </div>

        <Link
          href="/customer/ads"
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-brand-blue to-slate-900 px-5 py-4 shadow-sm shadow-blue-500/20"
        >
          <div>
            <p className="text-sm font-bold text-white">Promotions Near You</p>
            <p className="mt-0.5 text-xs text-white/70">See local deals and discount codes</p>
          </div>
          <span className="text-white/70">→</span>
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Your Jobs
        </p>

        {jobs.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white p-6 text-center shadow-sm shadow-slate-900/5">
            <p className="text-sm text-slate-500">
              No jobs yet. Use the booking link your service provider shared
              with you, or enter their business code above.
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
