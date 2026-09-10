"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  listPublicShops,
  listPublicShopCategories,
  isShopOpenNow,
  type PublicShop,
} from "@/lib/customer/bookings";

export default function DiscoverShopsPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverShopsContent />
    </Suspense>
  );
}

function DiscoverShopsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [categories, setCategories] = useState<string[]>([]);
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  const load = useCallback(
    async (filters?: { search?: string; city?: string; category?: string }) => {
      setLoading(true);
      const results = await listPublicShops(filters);
      setShops(results);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    const initialSearch = searchParams.get("q") ?? "";
    const initialCategory = searchParams.get("category") ?? "";
    const id = setTimeout(() => {
      load({ search: initialSearch, category: initialCategory });
      listPublicShopCategories().then(setCategories).catch(() => {});
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearched(true);
    load({ search: search.trim(), city: city.trim(), category });
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    setSearched(true);
    load({ search: search.trim(), city: city.trim(), category: value });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <div className="mx-auto max-w-lg">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Back
          </button>
        </header>

        <h1 className="mt-3 text-lg font-bold text-slate-900">
          Find Services Near You
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Browse businesses on ShopPulse by category, name, or city.
        </p>

        <form onSubmit={handleSearch} className="mt-4 space-y-2">
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search business name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
          >
            Search
          </button>
        </form>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            </div>
          ) : shops.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm shadow-slate-900/5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <SearchX className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {searched
                  ? "No businesses matched your search."
                  : "No businesses listed yet."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {shops.map((shop) => {
                const open = isShopOpenNow(shop);
                return (
                  <li key={shop.id}>
                    <Link
                      href={`/customer/shop/${shop.slug}`}
                      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 transition-shadow hover:shadow-md"
                    >
                      {shop.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shop.logo_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-brand-blue">
                          {shop.shop_name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {shop.shop_name}
                          </p>
                          {shop.business_hours_open && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                open
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {open ? "Open Now" : "Closed"}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {[shop.business_category, shop.city].filter(Boolean).join(" · ") ||
                            "Service provider"}
                        </p>
                        <p
                          className={`mt-0.5 text-[11px] font-medium ${
                            shop.avg_rating !== null ? "text-amber-500" : "text-slate-400"
                          }`}
                        >
                          {shop.avg_rating !== null
                            ? `★ ${shop.avg_rating.toFixed(1)} (${shop.review_count})`
                            : "★ 0 — No rating and review yet"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
