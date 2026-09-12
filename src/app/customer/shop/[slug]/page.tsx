"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MessageCircle, Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchShopBySlug,
  isShopOpenNow,
  listShopReviews,
  listPublicShopServices,
  type BookingShop,
  type ShopReview,
  type PublicService,
} from "@/lib/customer/bookings";
import { fetchCurrentCustomer } from "@/lib/customer/customerAuth";
import { ensureCustomerConversation } from "@/lib/chat/chat";

const ShopLocationMap = dynamic(
  () => import("@/components/customer/ShopLocationMap"),
  { ssr: false, loading: () => <div className="h-[180px] rounded-xl bg-white/5" /> }
);

const DAY_LABELS: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export default function ShopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<BookingShop | null>(null);
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const shopRow = await fetchShopBySlug(slug);
    if (!shopRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setShop(shopRow);
    setLoading(false);
    listShopReviews(shopRow.id).then(setReviews).catch(() => {});
    listPublicShopServices(shopRow.id).then(setServices).catch(() => {});
  }, [slug]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (notFound || !shop) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy px-6 text-center">
        <p className="text-sm text-slate-400">
          We couldn&apos;t find this business. Double-check the link and try again.
        </p>
      </main>
    );
  }

  const open = isShopOpenNow(shop);
  const hasHours = Boolean(shop.business_hours_open && shop.business_hours_close);

  async function handleChat(prefillText?: string) {
    const customer = await fetchCurrentCustomer();
    if (!customer) {
      router.push("/customer");
      return;
    }
    const conversationId = await ensureCustomerConversation(shop!.slug);
    const query = prefillText ? `?prefill=${encodeURIComponent(prefillText)}` : "";
    router.push(`/customer/messages/${conversationId}${query}`);
  }

  return (
    <main className="min-h-screen bg-brand-navy px-5 py-6">
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          ← Back
        </button>

        <div className="mt-4 rounded-2xl bg-white/5 p-6 shadow-md shadow-black/20">
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logo_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-lg font-bold text-brand-blue">
                {shop.shop_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-white">
                {shop.shop_name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {[shop.business_category, shop.city].filter(Boolean).join(" · ") ||
                  "Service provider"}
              </p>
              <div className="mt-1 flex items-center gap-1">
                <Star
                  className={`h-3.5 w-3.5 ${
                    shop.avg_rating !== null
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-600"
                  }`}
                />
                <span className="text-xs font-semibold text-slate-300">
                  {shop.avg_rating !== null ? shop.avg_rating.toFixed(1) : "0"}
                </span>
                <span className="text-xs text-slate-500">
                  {shop.avg_rating !== null
                    ? `(${shop.review_count} review${shop.review_count === 1 ? "" : "s"})`
                    : "No rating and review yet"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {hasHours && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    open
                      ? "bg-brand-emerald/15 text-brand-emerald"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {open ? "Open Now" : "Closed"}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleChat()}
                className="flex items-center gap-1 rounded-full border border-brand-blue/40 px-2.5 py-1 text-[11px] font-semibold text-brand-blue"
              >
                <MessageCircle className="h-3 w-3" /> Chat
              </button>
            </div>
          </div>

          {hasHours && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Working Hours
              </p>
              <p className="mt-1.5 text-sm text-slate-300">
                {shop.business_hours_open} – {shop.business_hours_close}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {shop.business_days.length > 0
                  ? shop.business_days
                      .map((d) => DAY_LABELS[d] ?? d)
                      .join(", ")
                  : "No days set"}
              </p>
            </div>
          )}

          {shop.latitude !== null && shop.longitude !== null && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Location
              </p>
              <div className="mt-2">
                <ShopLocationMap latitude={shop.latitude} longitude={shop.longitude} />
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pricing
            </p>
            {shop.default_hourly_rate > 0 && (
              <p className="mt-1.5 text-sm text-slate-300">
                Standard Labor Fee:{" "}
                <span className="font-semibold text-white">
                  {shop.currency} {shop.default_hourly_rate.toFixed(2)}/hr
                </span>
              </p>
            )}
            {services.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-white/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-300">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-slate-500">{service.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="text-sm font-semibold text-white">
                        {shop.currency} {service.price.toFixed(2)}
                        {service.extra_cost > 0 && (
                          <span className="text-xs font-normal text-slate-400">
                            {" "}
                            +{service.extra_cost.toFixed(2)}
                          </span>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          handleChat(`Hi! I'm interested in: ${service.name}`)
                        }
                        className="flex items-center gap-1 text-[11px] font-medium text-brand-blue"
                      >
                        <MessageCircle className="h-3 w-3" /> Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {shop.default_hourly_rate === 0 && services.length === 0 && (
              <p className="mt-1.5 text-sm text-slate-400">
                Contact the business for pricing.
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Reviews
            </p>
            {reviews.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No rating and review yet.</p>
            ) : (
              <div className="mt-2 space-y-3">
                {reviews.slice(0, 5).map((review, index) => (
                  <div key={index} className="rounded-xl bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-1.5 text-xs text-slate-300">{review.comment}</p>
                    )}
                    {review.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={review.photo_url}
                        alt="Review photo"
                        className="mt-1.5 h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">— {review.client_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/customer/book/${shop.slug}`}
            className="mt-6 block w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3.5 text-center text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
          >
            Book Now
          </Link>
        </div>
      </div>
    </main>
  );
}
