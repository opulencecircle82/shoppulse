"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchCurrentCustomer } from "@/lib/customer/customerAuth";
import {
  listNearbyPromotions,
  recordPromotionEvent,
  type NearbyPromotion,
} from "@/lib/customer/bookings";

export default function CustomerAdsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<NearbyPromotion[]>([]);
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const viewedRef = useRef(new Set<string>());

  const load = useCallback(async () => {
    const customer = await fetchCurrentCustomer();
    const customerCity = customer?.city ?? null;
    setCity(customerCity);
    const rows = await listNearbyPromotions(customerCity);
    setPromotions(rows);
    setLoading(false);
    for (const promo of rows) {
      if (!viewedRef.current.has(promo.id)) {
        viewedRef.current.add(promo.id);
        recordPromotionEvent(promo.id, "view");
      }
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  return (
    <main className="min-h-screen bg-brand-navy px-5 py-6">
      <div className="mx-auto max-w-lg">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            ← Back
          </button>
        </header>

        <h1 className="mt-3 text-lg font-bold text-white">Promotions Near You</h1>
        <p className="mt-1 text-xs text-slate-400">
          {city
            ? `Deals from businesses in ${city}.`
            : "Set your city in your profile to see local deals."}
        </p>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            </div>
          ) : promotions.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-8 text-center shadow-md shadow-black/20">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Megaphone className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-400">No promotions near you yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {promotions.map((promo) => (
                <li key={promo.id}>
                  <Link
                    href={`/customer/book/${promo.shop_slug}`}
                    onClick={() => recordPromotionEvent(promo.id, "click")}
                    className="block overflow-hidden rounded-2xl bg-white/5 shadow-md shadow-black/20 transition-shadow hover:shadow-lg"
                  >
                    {promo.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={promo.image_url}
                        alt={promo.title}
                        className="aspect-[3/2] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[3/2] w-full items-center justify-center bg-gradient-to-br from-brand-blue to-slate-900 p-6 text-center">
                        <p className="text-lg font-bold text-white">{promo.title}</p>
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-white">{promo.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {promo.shop_name}
                        {promo.shop_city ? ` · ${promo.shop_city}` : ""}
                      </p>
                      {promo.description && (
                        <p className="mt-1.5 text-xs text-slate-300">{promo.description}</p>
                      )}
                      {promo.discount_code && (
                        <span className="mt-2 inline-block rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold text-brand-orange">
                          Code: {promo.discount_code}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
