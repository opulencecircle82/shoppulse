"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useShop } from "@/lib/hooks/useShop";
import { supabase } from "@/lib/supabase/client";
import { stockPhotoForCategory } from "@/lib/location/categoryStockPhotos";
import {
  WEBSITE_TEMPLATES,
  WEBSITE_FONT_OPTIONS,
  WEBSITE_BUTTON_STYLES,
  getWebsiteTemplate,
  websiteTextClasses,
  getButtonStyleProps,
  type WebsiteTemplateKey,
  type WebsiteButtonStyleKey,
} from "@/lib/site/websiteTemplates";

export default function WebsiteCustomizePage() {
  const { checked } = useRequireAuth();
  const { loading, shop, staffMember, isOwner, refresh } = useShop();
  const [templateKey, setTemplateKey] = useState<WebsiteTemplateKey>(
    (shop?.website_template as WebsiteTemplateKey) ?? "classic-dark"
  );
  const [primaryColor, setPrimaryColor] = useState(shop?.primary_color_hex ?? "#2563EB");
  const [accentColor, setAccentColor] = useState(shop?.accent_color_hex ?? "#F97316");
  const [fontFamily, setFontFamily] = useState(shop?.website_font_family ?? "Inter");
  const [fontScale, setFontScale] = useState(shop?.website_font_scale ?? 100);
  const [buttonStyle, setButtonStyle] = useState<WebsiteButtonStyleKey>(
    (shop?.website_button_style as WebsiteButtonStyleKey) ?? "3d"
  );
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (shop && !initialized) {
    setTemplateKey((shop.website_template as WebsiteTemplateKey) ?? "classic-dark");
    setPrimaryColor(shop.primary_color_hex);
    setAccentColor(shop.accent_color_hex);
    setFontFamily(shop.website_font_family);
    setFontScale(shop.website_font_scale);
    setButtonStyle((shop.website_button_style as WebsiteButtonStyleKey) ?? "3d");
    setInitialized(true);
  }

  useEffect(() => {
    const linkId = "website-customize-font-preview";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      fontFamily
    )}:wght@400;600;700;800&display=swap`;
  }, [fontFamily]);

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
      .update({
        primary_color_hex: primaryColor,
        accent_color_hex: accentColor,
        website_template: templateKey,
        website_font_family: fontFamily,
        website_font_scale: fontScale,
        website_button_style: buttonStyle,
      })
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
  const currentTemplate = getWebsiteTemplate(templateKey);
  const tc = websiteTextClasses(currentTemplate.textMode);
  const bookButton = getButtonStyleProps(buttonStyle, primaryColor, accentColor);

  return (
    <main className="min-h-screen bg-brand-navy">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Customize Your Website</h1>
            <p className="mt-1 text-sm text-slate-400">
              Pick a design for your free public website ({" "}
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue hover:text-blue-400"
              >
                shoppulse-web.vercel.app{siteUrl}
              </a>
              {" "}).
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
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {WEBSITE_TEMPLATES.map((template) => {
                  const isActive = templateKey === template.key;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => {
                        setTemplateKey(template.key);
                        setPrimaryColor(template.defaultPrimary);
                        setAccentColor(template.defaultAccent);
                      }}
                      className={`overflow-hidden rounded-2xl transition-colors ${
                        isActive ? "ring-2 ring-brand-blue" : "hover:opacity-90"
                      }`}
                    >
                      <div
                        style={{ background: template.background }}
                        className="flex h-16 items-center justify-center gap-1.5"
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shadow"
                          style={{ backgroundColor: template.defaultPrimary }}
                        />
                        <span
                          className="h-3.5 w-3.5 rounded-full shadow"
                          style={{ backgroundColor: template.defaultAccent }}
                        />
                      </div>
                      <span
                        className={`block px-2 py-1.5 text-[11px] font-medium ${
                          isActive ? "bg-brand-blue/15 text-brand-blue" : "bg-white/5 text-slate-300"
                        }`}
                      >
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
              <p className="mt-2 text-xs text-slate-500 sm:max-w-md">
                Fine-tune the button/accent colors without changing the
                template&apos;s background.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Font
              </p>
              <div className="mt-3 sm:max-w-md">
                <label className="block text-xs font-medium text-slate-400">
                  Font Family
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  {WEBSITE_FONT_OPTIONS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
                <p
                  style={{ fontFamily: `"${fontFamily}", sans-serif` }}
                  className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-sm text-white"
                >
                  The quick brown fox — {shop.currency} 1,234.56
                </p>
              </div>

              <div className="mt-5 sm:max-w-md">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-400">
                    Font Size Scale
                  </label>
                  <span className="text-xs text-slate-400">{fontScale}%</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={150}
                  step={5}
                  value={fontScale}
                  onChange={(e) => setFontScale(Number(e.target.value))}
                  className="mt-1.5 w-full accent-brand-blue"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Button Style
              </p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {WEBSITE_BUTTON_STYLES.map((style) => {
                  const preview = getButtonStyleProps(style.key, primaryColor, accentColor);
                  const isActive = buttonStyle === style.key;
                  return (
                    <button
                      key={style.key}
                      type="button"
                      onClick={() => setButtonStyle(style.key)}
                      className={`flex flex-col items-center gap-2 rounded-xl p-2.5 transition-colors ${
                        isActive ? "bg-white/10 ring-2 ring-brand-blue" : "hover:bg-white/5"
                      }`}
                    >
                      <span
                        style={preview.style}
                        className={`flex h-7 w-full items-center justify-center text-[9px] ${preview.className}`}
                      >
                        Go
                      </span>
                      <span className="text-[10px] font-medium text-slate-300">
                        {style.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400 sm:max-w-md">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald sm:max-w-md">
                Saved — your website is now live with this design.
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Website Design"}
            </button>
          </form>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Live Preview
            </p>
            <div
              style={{
                background: currentTemplate.background,
                fontFamily: `"${fontFamily}", sans-serif`,
                zoom: `${fontScale}%`,
              }}
              className="mt-3 overflow-hidden rounded-3xl border border-white/10 shadow-xl shadow-black/30"
            >
              <div className="relative h-36 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={headerUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-2.5 px-4 pb-3">
                  {shop.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shop.logo_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-xl border-2 border-black/20 object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black/20 bg-brand-blue text-xs font-bold text-white">
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
                  style={bookButton.style}
                  className={`px-4 py-2.5 text-center text-xs ${bookButton.className}`}
                >
                  Book Now
                </div>

                <div className={`mt-3 flex flex-wrap gap-3 text-[11px] ${tc.body}`}>
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
              Updates live as you customize — save to publish it to your real
              website.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
