"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Star, MapPin } from "lucide-react";
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
  type WebsiteTemplate,
  type WebsiteTemplateKey,
  type WebsiteButtonStyleKey,
} from "@/lib/site/websiteTemplates";

function templateTags(template: WebsiteTemplate): string[] {
  const shade = template.textMode === "light" ? "DARK" : "LIGHT";
  const surface = template.background.includes("gradient") ? "GRADIENT" : "SOLID";
  return [shade, surface];
}

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

  function loadFromShop() {
    if (!shop) return;
    setTemplateKey((shop.website_template as WebsiteTemplateKey) ?? "classic-dark");
    setPrimaryColor(shop.primary_color_hex);
    setAccentColor(shop.accent_color_hex);
    setFontFamily(shop.website_font_family);
    setFontScale(shop.website_font_scale);
    setButtonStyle((shop.website_button_style as WebsiteButtonStyleKey) ?? "3d");
  }

  if (shop && !initialized) {
    loadFromShop();
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
  const sampleServices = [
    { name: "Standard Visit", price: 500 },
    { name: "Priority Callout", price: 850 },
  ];

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-brand-navy">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold text-white">
            SP
          </span>
          <h1 className="shrink-0 text-base font-bold text-white">Customize Website</h1>
          <span className="truncate text-sm text-slate-500">{shop.shop_name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={loadFromShop}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-white/40 hover:text-white"
          >
            Reset
          </button>
          <button
            type="submit"
            form="website-form"
            disabled={saving}
            className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-brand-emerald/15 px-5 py-2 text-xs font-semibold text-brand-emerald transition-colors hover:bg-brand-emerald/25"
          >
            View Website →
          </a>
        </div>
      </header>

      <div className="grid flex-1 overflow-hidden md:grid-cols-[300px_1fr]">
        <form
          id="website-form"
          onSubmit={handleSubmit}
          className="space-y-6 overflow-y-auto border-b border-white/10 p-5 md:border-b-0 md:border-r"
        >
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Templates
            </p>
            <div className="grid grid-cols-2 gap-2">
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
                    className={`rounded-xl p-2.5 text-left transition-colors ${
                      isActive ? "bg-white/10 ring-2 ring-brand-blue" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <p className="truncate text-xs font-semibold text-white">
                      {template.name}
                    </p>
                    <div
                      style={{ background: template.background }}
                      className="mt-1.5 flex h-6 items-center gap-1 rounded-md px-1.5"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: template.defaultPrimary }}
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: template.defaultAccent }}
                      />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {templateTags(template).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-black/30 px-1.5 py-0.5 text-[8px] font-semibold tracking-wide text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Font
            </p>
            <label className="block text-xs font-medium text-slate-400">Font Family</label>
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
              className="mt-2 truncate rounded-lg bg-black/20 px-3 py-2 text-sm text-white"
            >
              The quick brown fox — {shop.currency} 1,234.56
            </p>

            <div className="mt-4 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">Font Size Scale</label>
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
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Button Style
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {WEBSITE_BUTTON_STYLES.map((style) => {
                const preview = getButtonStyleProps(style.key, primaryColor, accentColor);
                const isActive = buttonStyle === style.key;
                return (
                  <button
                    key={style.key}
                    type="button"
                    onClick={() => setButtonStyle(style.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors ${
                      isActive ? "bg-white/10 ring-2 ring-brand-blue" : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      style={preview.style}
                      className={`flex h-6 w-full items-center justify-center text-[8px] ${preview.className}`}
                    >
                      Go
                    </span>
                    <span className="text-[9px] font-medium text-slate-300">{style.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Colors
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400">Primary</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-11 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  />
                  <span className="truncate text-xs text-slate-400">{primaryColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">Accent</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-9 w-11 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  />
                  <span className="truncate text-xs text-slate-400">{accentColor}</span>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald">
              Saved — your website is now live with this design.
            </p>
          )}
        </form>

        <div className="overflow-y-auto bg-black/20 p-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              ● Live Preview
            </p>
            <p className="text-xs text-slate-500">Changes update in real-time</p>
          </div>

          <div
            style={{
              background: currentTemplate.background,
              fontFamily: `"${fontFamily}", sans-serif`,
              zoom: `${fontScale}%`,
            }}
            className="mx-auto mt-3 max-w-3xl overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/40"
          >
            <div className="relative h-64 w-full overflow-hidden sm:h-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={headerUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-6 pb-5">
                {shop.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shop.logo_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl border-2 border-black/20 object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-black/20 bg-brand-blue text-lg font-bold text-white">
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
                      className="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                    >
                      {shop.business_category}
                    </span>
                  )}
                  <p className="mt-1 truncate text-2xl font-bold text-white">
                    {shop.shop_name}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div
                style={bookButton.style}
                className={`px-6 py-4 text-center text-base ${bookButton.className}`}
              >
                Book Now
              </div>

              <div className={`mt-5 flex flex-wrap gap-4 text-sm ${tc.body}`}>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" style={{ color: accentColor }} />
                  {shop.address || shop.city || "Service area"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  4.9 (sample rating)
                </span>
              </div>

              <div className={`mt-6 border-t pt-5 ${tc.border}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${tc.muted}`}>
                  Pricing
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {sampleServices.map((service) => (
                    <div
                      key={service.name}
                      className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${tc.card}`}
                    >
                      <p className={`text-sm ${tc.heading}`}>{service.name}</p>
                      <p className={`text-sm font-semibold ${tc.heading}`}>
                        {shop.currency} {service.price.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
