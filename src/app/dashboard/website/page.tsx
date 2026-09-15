"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useShop } from "@/lib/hooks/useShop";
import { supabase } from "@/lib/supabase/client";
import { stockPhotoForCategory } from "@/lib/location/categoryStockPhotos";

const COLOR_TEMPLATES = [
  { name: "ShopPulse", primary: "#2563EB", accent: "#F97316" },
  { name: "Emerald", primary: "#0F172A", accent: "#10B981" },
  { name: "Violet", primary: "#5B21B6", accent: "#F59E0B" },
  { name: "Rose", primary: "#1E293B", accent: "#E11D48" },
  { name: "Teal", primary: "#0F766E", accent: "#FB7185" },
  { name: "Indigo", primary: "#4338CA", accent: "#84CC16" },
] as const;

export default function WebsiteCustomizePage() {
  const { checked } = useRequireAuth();
  const { loading, shop, staffMember, isOwner, refresh } = useShop();
  const [primaryColor, setPrimaryColor] = useState(shop?.primary_color_hex ?? "#2563EB");
  const [accentColor, setAccentColor] = useState(shop?.accent_color_hex ?? "#F97316");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (shop && !initialized) {
    setPrimaryColor(shop.primary_color_hex);
    setAccentColor(shop.accent_color_hex);
    setInitialized(true);
  }

  if (!checked || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (staffMember && !isOwner) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-6 text-center">
        <h1 className="text-xl font-semibold text-white">Owners only</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          The business website can only be customized by the shop owner.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 text-sm font-medium text-brand-blue hover:text-blue-400"
        >
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-6 text-center">
        <h1 className="text-xl font-semibold text-white">Set up your shop first</h1>
        <Link
          href="/dashboard/settings"
          className="mt-6 text-sm font-medium text-brand-blue hover:text-blue-400"
        >
          ← Business Settings
        </Link>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("shops")
      .update({ primary_color_hex: primaryColor, accent_color_hex: accentColor })
      .eq("id", shop!.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    refresh();
  }

  const headerUrl = shop.website_header_url || stockPhotoForCategory(shop.business_category);
  const siteUrl = `/site/${shop.slug}`;

  return (
    <main className="min-h-screen bg-brand-navy">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Customize Your Website</h1>
            <p className="mt-1 text-sm text-slate-400">
              Pick the colors your free public website ({" "}
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue hover:text-blue-400"
              >
                shoppulse-web.vercel.app{siteUrl}
              </a>
              {" "}) uses.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Templates
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {COLOR_TEMPLATES.map((template) => {
                  const isActive =
                    primaryColor.toLowerCase() === template.primary.toLowerCase() &&
                    accentColor.toLowerCase() === template.accent.toLowerCase();
                  return (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(template.primary);
                        setAccentColor(template.accent);
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl p-2.5 transition-colors ${
                        isActive ? "bg-white/10 ring-2 ring-brand-blue" : "hover:bg-white/5"
                      }`}
                    >
                      <span
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${template.primary}, ${template.accent})`,
                        }}
                        className="h-10 w-10 rounded-full shadow-md shadow-black/30"
                      />
                      <span className="text-[10px] font-medium text-slate-300">
                        {template.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
                <div>
                  <label className="block text-xs font-medium text-slate-400">
                    Primary Color
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">{primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400">
                    Accent Color
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">{accentColor}</span>
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400 sm:max-w-md">
                  {error}
                </p>
              )}
              {success && (
                <p className="mt-4 rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald sm:max-w-md">
                  Saved — your website is now live with these colors.
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-6 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Website Colors"}
              </button>
            </div>
          </form>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Live Preview
            </p>
            <div className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-brand-navy shadow-xl shadow-black/30">
              <div className="relative h-36 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={headerUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/40 to-black/20" />
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-2.5 px-4 pb-3">
                  {shop.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shop.logo_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-xl border-2 border-brand-navy object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-brand-navy bg-brand-blue text-xs font-bold text-white">
                      {shop.shop_name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    {shop.business_category && (
                      <span
                        style={{
                          borderColor: `${accentColor}4D`,
                          backgroundColor: `${accentColor}1A`,
                          color: accentColor,
                        }}
                        className="inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium"
                      >
                        {shop.business_category}
                      </span>
                    )}
                    <p className="mt-0.5 truncate text-sm font-bold text-white">
                      {shop.shop_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div
                  style={{
                    backgroundImage: `linear-gradient(to right, ${primaryColor}, ${accentColor})`,
                  }}
                  className="rounded-full px-4 py-2.5 text-center text-xs font-bold text-white"
                >
                  Book Now
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" style={{ color: accentColor }} />
                    {shop.address || shop.city || "Service area"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    Sample rating
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Updates live as you pick colors — save to publish it to your real
              website.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
