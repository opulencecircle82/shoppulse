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
  MessageCircle,
  Settings,
} from "lucide-react";
import type { JobTicket } from "@/lib/supabase/types";
import type { Customer } from "@/lib/customer/customerAuth";
import { signOutCustomer } from "@/lib/customer/customerAuth";
import { listCustomerAddresses } from "@/lib/customer/addresses";
import {
  listNearbyPromotions,
  recordPromotionEvent,
  listFeaturedServices,
  listNearbyShopServices,
  fetchTicketTechnician,
  fetchTicketStaffLocation,
  type NearbyPromotion,
  type FeaturedService,
  type NearbyService,
  type TicketTechnician,
} from "@/lib/customer/bookings";
import { distanceKm, formatDistance } from "@/lib/geo/distance";
import { listCustomerConversations } from "@/lib/chat/chat";
import { playMessageChime } from "@/lib/chat/chime";
import CustomerNotificationBell from "./CustomerNotificationBell";
import CurvedLinesBackground from "@/components/ui/CurvedLinesBackground";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400",
  REJECTED: "bg-red-500/15 text-red-400",
  UNASSIGNED: "bg-white/10 text-slate-400",
  SCHEDULED: "bg-brand-blue/15 text-brand-blue",
  IN_PROGRESS: "bg-brand-blue/15 text-brand-blue",
  COMPLETED: "bg-brand-blue/15 text-brand-blue",
  APPROVED: "bg-brand-emerald/15 text-brand-emerald",
  DISPUTED: "bg-red-500/15 text-red-400",
};

// The business hasn't accepted this yet, so it isn't a real job on the
// books — showing the raw "PENDING" status here reads like it already
// is one. Every other status keeps its plain label.
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Request Sent",
};

const QUICK_CATEGORIES = [
  { label: "Electrical", icon: Zap, color: "text-amber-500" },
  { label: "Plumbing", icon: Droplet, color: "text-brand-sky" },
  { label: "HVAC", icon: Wind, color: "text-cyan-500" },
  { label: "Handyman & Painting", icon: Wrench, color: "text-brand-orange" },
  { label: "House Cleaning", icon: Sparkles, color: "text-fuchsia-500" },
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
  const [nearbyServices, setNearbyServices] = useState<(NearbyService | FeaturedService)[]>([]);
  const [nearbyIsDistanceBased, setNearbyIsDistanceBased] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    customer.latitude !== null && customer.longitude !== null
      ? { lat: customer.latitude, lng: customer.longitude }
      : null
  );
  const [technician, setTechnician] = useState<TicketTechnician | null>(null);
  const [techDistance, setTechDistance] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
      listCustomerAddresses().then((addresses) => {
        if (!active) return;
        const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
        if (defaultAddress?.latitude !== null && defaultAddress?.latitude !== undefined &&
            defaultAddress?.longitude !== null && defaultAddress?.longitude !== undefined) {
          setPin({ lat: defaultAddress.latitude, lng: defaultAddress.longitude });
        }
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [customer.city]);

  useEffect(() => {
    let active = true;
    if (pin) {
      listNearbyShopServices(pin.lat, pin.lng, 10).then((rows) => {
        if (!active) return;
        setNearbyServices(rows);
        setNearbyIsDistanceBased(true);
      });
    } else {
      listFeaturedServices(customer.city).then((rows) => {
        if (active) setNearbyServices(rows);
      });
    }
    return () => {
      active = false;
    };
  }, [pin, customer.city]);

  const unreadRef = useRef(0);

  useEffect(() => {
    let active = true;
    function loadUnread() {
      listCustomerConversations().then((rows) => {
        if (!active) return;
        const total = rows.reduce((sum, r) => sum + r.unreadCount, 0);
        if (total > unreadRef.current) playMessageChime();
        unreadRef.current = total;
        setUnreadMessages(total);
      });
    }
    loadUnread();
    const interval = setInterval(loadUnread, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

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
      if (!active || !loc || !pin) return;
      const km = distanceKm(pin, { lat: loc.lat, lng: loc.lng });
      setTechDistance(formatDistance(km));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJob?.id, pin]);

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
    <main className="min-h-screen bg-brand-navy px-5 py-6">
      <div className="mx-auto max-w-lg">
        <header className="relative flex items-center justify-between rounded-3xl bg-brand-navy px-5 py-5">
          {/* Clipped in its own layer, not on the header itself — the
              header needs to stay overflow-visible so the notification
              dropdown below isn't cut off. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <CurvedLinesBackground />
          </div>
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-medium text-brand-orange">
              ShopPulse
            </span>
            <p className="mt-1.5 text-lg font-bold text-white">Hi, {customer.fullName}</p>
            <p className="text-xs text-white/60">Your jobs, all in one place</p>
          </div>
          <div className="relative flex items-center gap-1">
            <Link
              href="/customer/messages"
              className="relative flex h-10 w-10 items-center justify-center"
              aria-label="Messages"
            >
              {unreadMessages > 0 && (
                <span className="absolute inset-0 animate-ping rounded-full bg-brand-blue opacity-60" />
              )}
              <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  unreadMessages > 0
                    ? "bg-brand-blue text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]"
                    : "text-white/80"
                }`}
              >
                <MessageCircle className="h-5 w-5" />
              </span>
              {unreadMessages > 0 && (
                <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Link>
            <CustomerNotificationBell customerId={customer.id} />
            <Link
              href="/customer/settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm font-medium text-white/70 hover:text-white"
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
            className="w-full rounded-xl bg-white/5 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 shadow-md shadow-black/20 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </form>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {QUICK_CATEGORIES.map(({ label, icon: Icon, color }) => (
            <Link
              key={label}
              href={`/customer/discover?category=${encodeURIComponent(label)}`}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md shadow-black/25 transition-transform active:scale-95">
                <Icon className={`h-5 w-5 ${color}`} />
              </span>
              <span className="text-[10px] font-medium leading-tight text-slate-300">
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
                className="relative block h-32 w-64 shrink-0 snap-start overflow-hidden rounded-2xl shadow-md shadow-black/20"
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

        {nearbyServices.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {nearbyIsDistanceBased ? "Services Near You (within 10 km)" : "Featured Services"}
            </p>
            <div className="mt-3 space-y-3">
              {nearbyServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {service.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{service.shop_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {service.avg_rating !== null && (
                          <p className="flex items-center gap-1 text-xs text-amber-400">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {service.avg_rating.toFixed(1)} ({service.review_count})
                          </p>
                        )}
                        {"distance_km" in service && (
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <Navigation className="h-3 w-3" />
                            {formatDistance(service.distance_km)}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-white">
                      {service.price.toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href={`/customer/book/${service.shop_slug}`}
                    className="mt-3 block w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-2 text-center text-xs font-bold text-white shadow-sm shadow-blue-500/30"
                  >
                    Book Now
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white/5 p-5 shadow-md shadow-black/20">
          <p className="text-sm font-semibold text-white">Book a New Job</p>
          <p className="mt-1 text-xs text-slate-400">
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
              className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/30"
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

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Your Jobs
        </p>

        {jobs.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white/5 p-8 text-center shadow-md shadow-black/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
              <ClipboardList className="h-5 w-5 text-brand-blue" />
            </div>
            <p className="mt-3 text-sm text-slate-400">
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
                  className="block rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20 transition-shadow hover:shadow-lg"
                >
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      STATUS_STYLES[job.status] ?? "bg-white/10 text-slate-400"
                    }`}
                  >
                    {STATUS_LABELS[job.status] ?? job.status.replace("_", " ")}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {job.service_type}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{job.service_address}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
