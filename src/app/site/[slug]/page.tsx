"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Star, MapPin, Clock } from "lucide-react";
import {
  fetchShopBySlug,
  isShopOpenNow,
  listShopReviews,
  listPublicShopServices,
  type BookingShop,
  type ShopReview,
  type PublicService,
} from "@/lib/customer/bookings";
import { stockPhotoForCategory } from "@/lib/location/categoryStockPhotos";
import {
  getWebsiteTemplate,
  websiteTextClasses,
  getButtonStyleProps,
} from "@/lib/site/websiteTemplates";

const DAY_LABELS: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export default function ShopWebsitePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<BookingShop | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);

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

  useEffect(() => {
    if (!shop?.website_font_family) return;
    const linkId = "site-font-preview";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      shop.website_font_family
    )}:wght@400;600;700;800&display=swap`;
  }, [shop?.website_font_family]);

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
  const headerUrl = shop.website_header_url || stockPhotoForCategory(shop.business_category);
  const bookHref = `/customer/book/${shop.slug}`;
  const template = getWebsiteTemplate(shop.website_template);
  const tc = websiteTextClasses(template.textMode);
  const bookButton = getButtonStyleProps(
    shop.website_button_style,
    shop.primary_color_hex,
    shop.accent_color_hex
  );

  return (
    <main
      className="min-h-screen"
      style={{
        background: template.background,
        fontFamily: `"${shop.website_font_family}", sans-serif`,
        zoom: `${shop.website_font_scale}%`,
      }}
    >
      <div className="relative h-72 w-full overflow-hidden sm:h-96">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={headerUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <div className="absolute inset-x-0 bottom-0 px-6 pb-6 sm:px-10">
          <div className="mx-auto flex max-w-3xl items-end gap-4">
            {shop.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logo_url}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl border-2 border-black/20 object-cover shadow-lg sm:h-20 sm:w-20"
              />
            )}
            <div className="min-w-0">
              {shop.business_category && (
                <span
                  style={{
                    borderColor: `${shop.accent_color_hex}4D`,
                    backgroundColor: `${shop.accent_color_hex}1A`,
                    color: shop.accent_color_hex,
                  }}
                  className="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                >
                  {shop.business_category}
                </span>
              )}
              <h1 className="mt-1.5 truncate text-2xl font-bold text-white sm:text-3xl">
                {shop.shop_name}
              </h1>
              {shop.avg_rating !== null && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-white/80">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {shop.avg_rating.toFixed(1)} ({shop.review_count} review
                  {shop.review_count === 1 ? "" : "s"})
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
        <Link
          href={bookHref}
          style={bookButton.style}
          className={`block w-full px-6 py-4 text-center text-base ${bookButton.className}`}
        >
          Book Now
        </Link>

        <div className={`mt-6 flex flex-wrap gap-4 text-sm ${tc.body}`}>
          {shop.address && (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" style={{ color: shop.accent_color_hex }} />
              {shop.address}
              {shop.city ? `, ${shop.city}` : ""}
            </p>
          )}
          {hasHours && (
            <p className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" style={{ color: shop.accent_color_hex }} />
              {shop.business_hours_open}–{shop.business_hours_close}
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  open
                    ? "bg-brand-emerald/15 text-brand-emerald"
                    : `${tc.card} ${tc.muted}`
                }`}
              >
                {open ? "Open Now" : "Closed"}
              </span>
            </p>
          )}
        </div>

        {hasHours && shop.business_days.length > 0 && (
          <p className={`mt-2 text-xs ${tc.faint}`}>
            Open {shop.business_days.map((d) => DAY_LABELS[d] ?? d).join(", ")}
          </p>
        )}

        {(shop.default_hourly_rate > 0 || services.length > 0) && (
          <div className={`mt-8 border-t pt-6 ${tc.border}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wide ${tc.muted}`}>
              Pricing
            </h2>
            {shop.default_hourly_rate > 0 && (
              <p className={`mt-2 text-sm ${tc.body}`}>
                Standard Labor Fee:{" "}
                <span className={`font-semibold ${tc.heading}`}>
                  {shop.currency} {shop.default_hourly_rate.toFixed(2)}/hr
                </span>
              </p>
            )}
            {services.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`flex items-start justify-between gap-2 rounded-xl px-4 py-3 ${tc.card}`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm ${tc.heading}`}>{service.name}</p>
                      {service.description && (
                        <p className={`text-xs ${tc.muted}`}>{service.description}</p>
                      )}
                    </div>
                    <p className={`shrink-0 text-sm font-semibold ${tc.heading}`}>
                      {shop.currency} {service.price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {reviews.length > 0 && (
          <div className={`mt-8 border-t pt-6 ${tc.border}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wide ${tc.muted}`}>
              What customers say
            </h2>
            <div className="mt-3 space-y-3">
              {reviews.slice(0, 5).map((review, index) => (
                <div key={index} className={`rounded-xl p-4 ${tc.card}`}>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-400"
                        }`}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className={`mt-1.5 text-sm ${tc.body}`}>{review.comment}</p>
                  )}
                  <p className={`mt-1 text-xs ${tc.faint}`}>— {review.client_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`mt-10 rounded-2xl p-6 text-center ${tc.card}`}>
          <p className={`text-sm font-semibold ${tc.heading}`}>Get the ShopPulse App</p>
          <p className={`mt-1 text-xs ${tc.muted}`}>
            Track your booking, live technician location, and proof photos —
            coming soon to Google Play and the App Store.
          </p>
          <Link
            href={bookHref}
            className="mt-3 inline-block text-xs font-semibold text-brand-blue hover:text-blue-400"
          >
            For now, book right here →
          </Link>
        </div>

        <p className={`mt-8 text-center text-xs ${tc.faint}`}>
          Powered by{" "}
          <Link href="/" className="hover:text-brand-blue">
            ShopPulse
          </Link>
        </p>
      </div>
    </main>
  );
}
