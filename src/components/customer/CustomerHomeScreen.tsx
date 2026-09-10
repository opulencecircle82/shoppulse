"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Zap,
  Droplet,
  Wind,
  Wrench,
  Sparkles,
  Star,
  Navigation,
  ClipboardList,
} from "lucide-react";
import type { JobTicket } from "@/lib/supabase/types";
import type { Customer } from "@/lib/customer/customerAuth";
import { signOutCustomer } from "@/lib/customer/customerAuth";
import {
  listNearbyPromotions,
  recordPromotionEvent,
  listFeaturedServices,
  fetchTicketTechnician,
  fetchTicketStaffLocation,
  type NearbyPromotion,
  type FeaturedService,
  type TicketTechnician,
} from "@/lib/customer/bookings";
import { distanceKm, formatDistance } from "@/lib/geo/distance";
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

const QUICK_CATEGORIES = [
  { label: "Electrician", icon: Zap },
  { label: "Plumbing", icon: Droplet },
  { label: "HVAC / Aircon Repair", icon: Wind },
  { label: "Handyman", icon: Wrench },
  { label: "Cleaning Services", icon: Sparkles },
] as const;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [promotions, setPromotions] = useState<NearbyPromotion[]>([]);
  const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>([]);
  const [technician, setTechnician] = useState<TicketTechnician | null>(null);
  const [techDistance, setTechDistance] = useState<string | null>(null);
  const viewedRef = useRef(new Set<string>());

  const activeJob =
    jobs.find((j) => j.status === "IN_PROGRESS") ??
    jobs.find((j) => j.status === "SCHEDULED" && j.staff_accepted_at) ??
    null;

  useEffect(() => {
    let active = true;
    const id = setTimeout(() => {
      listNearbyPromotions(customer.city).then((rows) => {
        if (!active) return;
        setPromotions(rows);
        for (const promo of rows.slice(0, 6)) {
          if (!viewedRef.current.has(promo.id)) {
            viewedRef.current.add(promo.id);
            recordPromotionEvent(promo.id, "view");
          }
        }
      });
      listFeaturedServices(customer.city).then((rows) => {
        if (active) setFeaturedServices(rows);
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [customer.city]);

  useEffect(() => {
    if (!activeJob) {
      const id = setTimeout(() => {
        setTechnician(null);
        setTechDistance(null);
      }, 0);
      return () => clearTimeout(id);
    }
    let active = true;
    fetchTicketTechnician(activeJob.id).then((tech) => {
      if (active) setTechnician(tech);
    });
    fetchTicketStaffLocation(activeJob.id).then((loc) => {
      if (!active || !loc) return;
      if (customer.latitude !== null && customer.longitude !== null) {
        const km = distanceKm(
          { lat: customer.latitude, lng: customer.longitude },
          { lat: loc.lat, lng: loc.lng }
        );
        setTechDistance(formatDistance(km));
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJob?.id]);

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

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(`/customer/discover?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <div className="mx-auto max-w-lg">
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

        <form onSubmit={handleSearchSubmit} className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 'Plumbing', 'AC Repair', 'Wiring'..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm shadow-slate-900/5 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </form>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {QUICK_CATEGORIES.map(({ label, icon: Icon }) => (
            <Link
              key={label}
              href={`/customer/discover?category=${encodeURIComponent(label)}`}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-2.5 text-center shadow-sm shadow-slate-900/5 transition-shadow hover:shadow-md"
            >
              <Icon className="h-5 w-5 text-brand-blue" />
              <span className="text-[10px] font-medium leading-tight text-slate-600">
                {label.split(" ")[0]}
              </span>
            </Link>
          ))}
        </div>

        {activeJob && (
          <Link
            href={`/client/${activeJob.id}`}
            className="mt-4 block rounded-2xl bg-gradient-to-br from-brand-blue to-slate-900 p-5 shadow-md shadow-blue-500/20"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
              {activeJob.status === "IN_PROGRESS" ? "IN PROGRESS" : "TECHNICIAN CONFIRMED"}
            </span>
            <p className="mt-2 text-sm font-bold text-white">{activeJob.service_type}</p>
            {techDistance && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
                <Navigation className="h-3 w-3" /> Technician {techDistance}
              </p>
            )}
            {technician && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-white/90">
                <span>Tech: {technician.full_name}</span>
                {technician.avg_rating !== null && (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {technician.avg_rating.toFixed(1)}
                  </span>
                )}
              </p>
            )}
            <span className="mt-3 inline-block text-xs font-semibold text-white underline underline-offset-2">
              View Live Proof &amp; GPS Map →
            </span>
          </Link>
        )}

        {promotions.length > 0 && (
          <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
            {promotions.slice(0, 6).map((promo) => (
              <Link
                key={promo.id}
                href={`/customer/book/${promo.shop_slug}`}
                onClick={() => recordPromotionEvent(promo.id, "click")}
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

        {featuredServices.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Featured Services
            </p>
            <div className="mt-3 space-y-3">
              {featuredServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {service.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{service.shop_name}</p>
                      {service.avg_rating !== null && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {service.avg_rating.toFixed(1)} ({service.review_count})
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-900">
                      {service.price.toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href={`/customer/book/${service.shop_slug}`}
                    className="mt-3 block w-full rounded-full bg-brand-blue px-4 py-2 text-center text-xs font-bold text-white shadow-sm shadow-blue-500/30"
                  >
                    Book Now
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

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
          <div className="mt-3 rounded-2xl bg-white p-8 text-center shadow-sm shadow-slate-900/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
              <ClipboardList className="h-5 w-5 text-brand-blue" />
            </div>
            <p className="mt-3 text-sm text-slate-500">
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
