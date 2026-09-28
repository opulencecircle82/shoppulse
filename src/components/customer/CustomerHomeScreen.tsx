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
  listNearbyShops,
  isShopOpenNow,
  type NearbyShop,
  type NearbyPromotion,
  type FeaturedService,
  type NearbyService,
} from "@/lib/customer/bookings";
import { formatDistance } from "@/lib/geo/distance";
import { stockPhotoForCategory } from "@/lib/location/categoryStockPhotos";
import { listCustomerConversations } from "@/lib/chat/chat";
import { playMessageChime } from "@/lib/chat/chime";
import CustomerNotificationBell from "./CustomerNotificationBell";
import CurvedLinesBackground from "@/components/ui/CurvedLinesBackground";
import LiveStatusBanner from "./LiveStatusBanner";
import ServiceBookingsHub from "./ServiceBookingsHub";
import ScheduleTomorrowLink from "./ScheduleTomorrowLink";

// How far around the customer "near you" reaches, for both businesses and services.
const NEARBY_RADIUS_KM = 20;

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
  const [nearbyShops, setNearbyShops] = useState<NearbyShop[]>([]);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    customer.latitude !== null && customer.longitude !== null
      ? { lat: customer.latitude, lng: customer.longitude }
      : null
  );
  const [unreadMessages, setUnreadMessages] = useState(0);
  const viewedRef = useRef(new Set<string>());

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
      listNearbyShopServices(pin.lat, pin.lng, NEARBY_RADIUS_KM).then((rows) => {
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

  // Every listed business around the customer — even one with no services yet, and one that hasn't
  // pinned its location but is in the customer's city or region.
  useEffect(() => {
    if (!pin && !customer.city && !customer.region) return;
    let active = true;
    listNearbyShops({
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
      city: customer.city,
      region: customer.region,
      radiusKm: NEARBY_RADIUS_KM,
    })
      .then((rows) => {
        if (active) setNearbyShops(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pin, customer.city, customer.region]);

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

        <LiveStatusBanner jobs={jobs} pin={pin} />

        <ServiceBookingsHub jobs={jobs} />

        <div className="mt-6 grid grid-cols-5 gap-2">
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

        {promotions.length > 0 && (
          <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
            {promotions.slice(0, 6).map((promo) =>
              promo.image_url ? (
                // The owner generated and applied a custom ad image (logo,
                // category photo, caption and code already baked in by the
                // dashboard's canvas renderer) — show it as-is.
                <Link
                  key={promo.id}
                  href={
                    promo.discount_percent
                      ? `/customer/book/${promo.shop_slug}?promo=${promo.id}&pct=${promo.discount_percent}`
                      : `/customer/book/${promo.shop_slug}`
                  }
                  onClick={() => recordPromotionEvent(promo.id, "click")}
                  className="relative block h-32 w-64 shrink-0 snap-start overflow-hidden rounded-2xl shadow-md shadow-black/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={promo.image_url}
                    alt={promo.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/40 px-3 py-1.5">
                    <p className="truncate text-xs font-semibold text-white">
                      {promo.shop_name}
                    </p>
                  </div>
                </Link>
              ) : (
                // No custom image yet — build the same look live from the
                // shop's category photo, logo and name, so every promotion
                // reads as a real ad immediately, with nothing for the
                // owner to generate or apply first.
                <Link
                  key={promo.id}
                  href={
                    promo.discount_percent
                      ? `/customer/book/${promo.shop_slug}?promo=${promo.id}&pct=${promo.discount_percent}`
                      : `/customer/book/${promo.shop_slug}`
                  }
                  onClick={() => recordPromotionEvent(promo.id, "click")}
                  className="relative block h-32 w-64 shrink-0 snap-start overflow-hidden rounded-2xl bg-cover bg-center p-3 shadow-md shadow-black/20"
                  style={{
                    backgroundImage: `url(${stockPhotoForCategory(promo.shop_category)})`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/85" />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-center gap-1.5">
                      {promo.shop_logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={promo.shop_logo_url}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-white/40"
                        />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                          {promo.shop_name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <p className="truncate text-[10px] font-semibold text-white/90">
                        {promo.shop_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight text-white">
                        {promo.title}
                      </p>
                      {promo.description && (
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-white/75">
                          {promo.description}
                        </p>
                      )}
                      {promo.discount_percent && (
                        <span className="mt-1 inline-block rounded bg-brand-orange px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {promo.discount_percent}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        )}

        {nearbyShops.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Businesses Near You</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Within {NEARBY_RADIUS_KM} km of you, plus businesses in your area that haven&apos;t pinned their location yet.
            </p>
            <ul className="mt-3 space-y-2">
              {nearbyShops.map((shop) => {
                const open = isShopOpenNow(shop);
                return (
                  <li key={shop.id} className="overflow-hidden rounded-2xl bg-white/5 shadow-md shadow-black/20">
                    <Link href={`/customer/shop/${shop.slug}`} className="flex items-center gap-3 p-3.5">
                      {shop.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shop.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-sm font-bold text-brand-blue">
                          {shop.shop_name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">{shop.shop_name}</p>
                          {/* A business with no working hours yet counts as closed — but can still take requests. */}
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              open ? "bg-brand-emerald/15 text-brand-emerald" : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {open ? "Open Now" : "Closed"}
                          </span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                          <span>{[shop.business_category, shop.city].filter(Boolean).join(" · ") || "Service provider"}</span>
                          <span className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {shop.distance_km !== null ? formatDistance(shop.distance_km) : "In your area"}
                          </span>
                        </p>
                        <p className={`mt-0.5 text-[11px] font-medium ${shop.avg_rating !== null ? "text-amber-400" : "text-slate-500"}`}>
                          {shop.avg_rating !== null ? `★ ${Number(shop.avg_rating).toFixed(1)} (${shop.review_count})` : "★ No rating yet"}
                        </p>
                      </div>
                    </Link>
                    {!open && (
                      <div className="px-3.5 pb-3.5">
                        <ScheduleTomorrowLink slug={shop.slug} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {nearbyServices.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {nearbyIsDistanceBased ? `Services Near You (within ${NEARBY_RADIUS_KM} km)` : "Featured Services"}
            </p>
            <div className="mt-3 space-y-3">
              {nearbyServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {service.shop_logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={service.shop_logo_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-sm font-bold text-brand-blue">
                          {service.shop_name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
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
      </div>
    </main>
  );
}
