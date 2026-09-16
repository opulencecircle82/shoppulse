"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ImageUp, Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useShop } from "@/lib/hooks/useShop";
import { supabase } from "@/lib/supabase/client";
import { stockPhotoForCategory } from "@/lib/location/categoryStockPhotos";
import {
  WEBSITE_TEMPLATES,
  WEBSITE_FONT_OPTIONS,
  WEBSITE_BUTTON_STYLES,
  getButtonStyleProps,
  contrastRatio,
  type WebsiteTemplate,
  type WebsiteTemplateKey,
  type WebsiteButtonStyleKey,
} from "@/lib/site/websiteTemplates";

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <span className="truncate text-xs text-slate-400">{value}</span>
      </div>
    </div>
  );
}

function templateTags(template: WebsiteTemplate): string[] {
  const shade = template.textMode === "light" ? "DARK" : "LIGHT";
  const surface = template.background.includes("gradient") ? "GRADIENT" : "SOLID";
  return [shade, surface];
}

export default function WebsiteCustomizePage() {
  const { checked } = useRequireAuth();
  const { loading, shop, staffMember, isOwner, refresh } = useShop();
  const headerInputId = useId();
  const [templateKey, setTemplateKey] = useState<WebsiteTemplateKey>(
    (shop?.website_template as WebsiteTemplateKey) ?? "classic-dark"
  );
  const [headerUrl, setHeaderUrl] = useState(shop?.website_header_url ?? null);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [headerUploadError, setHeaderUploadError] = useState<string | null>(null);
  const [headline, setHeadline] = useState(shop?.website_headline ?? "");
  const [subheadline, setSubheadline] = useState(shop?.website_subheadline ?? "");
  const [primaryColor, setPrimaryColor] = useState(shop?.primary_color_hex ?? "#2563EB");
  const [accentColor, setAccentColor] = useState(shop?.accent_color_hex ?? "#F97316");
  const [fontFamily, setFontFamily] = useState(shop?.website_font_family ?? "Inter");
  const [fontScale, setFontScale] = useState(shop?.website_font_scale ?? 100);
  const [buttonStyle, setButtonStyle] = useState<WebsiteButtonStyleKey>(
    (shop?.website_button_style as WebsiteButtonStyleKey) ?? "3d"
  );
  const [bgColor, setBgColor] = useState(shop?.website_bg_color ?? "#0F172A");
  const [cardColor, setCardColor] = useState(shop?.website_card_color ?? "#1E293B");
  const [textColor, setTextColor] = useState(shop?.website_text_color ?? "#CBD5E1");
  const [headingColor, setHeadingColor] = useState(shop?.website_heading_color ?? "#FFFFFF");
  const [priceColor, setPriceColor] = useState(shop?.website_price_color ?? "#F97316");
  const [mutedColor, setMutedColor] = useState(shop?.website_muted_color ?? "#94A3B8");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  function loadFromShop() {
    if (!shop) return;
    setTemplateKey((shop.website_template as WebsiteTemplateKey) ?? "classic-dark");
    setPrimaryColor(shop.primary_color_hex);
    setAccentColor(shop.accent_color_hex);
    setFontFamily(shop.website_font_family);
    setFontScale(shop.website_font_scale);
    setButtonStyle((shop.website_button_style as WebsiteButtonStyleKey) ?? "3d");
    setBgColor(shop.website_bg_color ?? "#0F172A");
    setCardColor(shop.website_card_color);
    setTextColor(shop.website_text_color);
    setHeadingColor(shop.website_heading_color);
    setPriceColor(shop.website_price_color);
    setMutedColor(shop.website_muted_color);
    setHeaderUrl(shop.website_header_url);
    setHeadline(shop.website_headline ?? "");
    setSubheadline(shop.website_subheadline ?? "");
  }

  async function handleHeaderFile(file: File | undefined) {
    if (!file || !shop) return;
    const looksLikeImage =
      file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      setHeaderUploadError("Please choose an image file.");
      return;
    }
    setHeaderUploadError(null);
    setUploadingHeader(true);

    const path = `${shop.id}/website-header-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
    const { error: uploadErr } = await supabase.storage
      .from("shop-logos")
      .upload(path, file, { contentType: file.type || "image/jpeg" });

    if (uploadErr) {
      setHeaderUploadError(uploadErr.message);
      setUploadingHeader(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("shop-logos").getPublicUrl(path);

    await supabase.from("shops").update({ website_header_url: publicUrl }).eq("id", shop.id);
    setHeaderUrl(publicUrl);
    setUploadingHeader(false);
    refresh();
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

  // The preview is the real /site/[slug] page, loaded in an iframe (not a
  // hand-built mockup) — draft colors/template/font/scale/button style are
  // pushed into it live via postMessage, so this can never drift out of
  // sync with what a real visitor sees.
  function sendPreviewTheme() {
    const frame = previewFrameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      {
        type: "shoppulse_preview_theme",
        theme: {
          website_template: templateKey,
          primary_color_hex: primaryColor,
          accent_color_hex: accentColor,
          website_font_family: fontFamily,
          website_font_scale: fontScale,
          website_button_style: buttonStyle,
          website_bg_color: bgColor,
          website_card_color: cardColor,
          website_text_color: textColor,
          website_heading_color: headingColor,
          website_price_color: priceColor,
          website_muted_color: mutedColor,
          website_headline: headline || null,
          website_subheadline: subheadline || null,
        },
      },
      window.location.origin
    );
  }

  useEffect(() => {
    sendPreviewTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    templateKey,
    primaryColor,
    accentColor,
    fontFamily,
    fontScale,
    buttonStyle,
    bgColor,
    cardColor,
    textColor,
    headingColor,
    priceColor,
    mutedColor,
    headline,
    subheadline,
  ]);

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
        website_bg_color: bgColor,
        website_card_color: cardColor,
        website_text_color: textColor,
        website_heading_color: headingColor,
        website_price_color: priceColor,
        website_muted_color: mutedColor,
        website_headline: headline || null,
        website_subheadline: subheadline || null,
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

  const siteUrl = `/site/${shop.slug}`;
  const lowContrast =
    contrastRatio(primaryColor, "#FFFFFF") < 3 || contrastRatio(accentColor, "#FFFFFF") < 3;

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
                      setBgColor(template.defaultBg);
                      setCardColor(template.defaultCard);
                      setTextColor(template.defaultText);
                      setHeadingColor(template.defaultHeading);
                      setPriceColor(template.defaultAccent);
                      setMutedColor(template.defaultMuted);
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
              Header Image
            </p>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={headerUrl || stockPhotoForCategory(shop.business_category)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <input
                  id={headerInputId}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleHeaderFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <label
                  htmlFor={headerInputId}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue ${
                    uploadingHeader ? "pointer-events-none opacity-60" : "cursor-pointer"
                  }`}
                >
                  {uploadingHeader && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {!uploadingHeader && <ImageUp className="h-3.5 w-3.5" />}
                  {uploadingHeader ? "Uploading..." : "Change"}
                </label>
              </div>
            </div>
            {headerUploadError && (
              <p className="mt-2 text-xs text-red-400">{headerUploadError}</p>
            )}
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Content
            </p>
            <label className="block text-xs font-medium text-slate-400">Primary Headline</label>
            <p className="mt-0.5 text-[11px] text-slate-500">
              A catchy line, not your business name — shown big at the top of your site.
            </p>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Book Now — We're Quality Field Workers"
              maxLength={80}
              className="mt-1.5 w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />

            <label className="mt-4 block text-xs font-medium text-slate-400">Sub Headline</label>
            <textarea
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              placeholder="e.g. Fast, reliable service you can count on — call us today"
              maxLength={160}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />

            {(headline || subheadline) && (
              <div
                className="mt-3 rounded-xl bg-black/20 px-3.5 py-3"
                style={{ fontFamily: `"${fontFamily}", sans-serif` }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Preview
                </p>
                {headline && (
                  <p className="mt-1.5 text-lg font-bold leading-tight" style={{ color: headingColor }}>
                    {headline}
                  </p>
                )}
                {subheadline && (
                  <p className="mt-1 text-sm" style={{ color: textColor }}>
                    {subheadline}
                  </p>
                )}
              </div>
            )}
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
              <ColorField label="Primary / Gradient" value={primaryColor} onChange={setPrimaryColor} />
              <ColorField label="Accent / Buttons" value={accentColor} onChange={setAccentColor} />
              <ColorField label="Background" value={bgColor} onChange={setBgColor} />
              <ColorField label="Cards / Panels" value={cardColor} onChange={setCardColor} />
              <ColorField label="Text Color" value={textColor} onChange={setTextColor} />
              <ColorField label="Product Name" value={headingColor} onChange={setHeadingColor} />
              <ColorField label="Price Text" value={priceColor} onChange={setPriceColor} />
              <ColorField
                label="Muted / Label Text"
                value={mutedColor}
                onChange={setMutedColor}
              />
            </div>

            {lowContrast && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                ⚠️ These colors look too close to white — button text may be
                hard to read.
              </p>
            )}
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

          {/* The real /site/[slug] page, loaded live in preview mode — not
              a mockup, so it always shows real services/reviews and can
              never look different from what a visitor actually gets. */}
          <iframe
            ref={previewFrameRef}
            src={`${siteUrl}?preview=1`}
            onLoad={sendPreviewTheme}
            title="Website live preview"
            className="mx-auto mt-3 block w-full max-w-3xl rounded-3xl border-0 shadow-2xl shadow-black/40"
            style={{ height: 900 }}
          />
        </div>
      </div>
    </main>
  );
}
