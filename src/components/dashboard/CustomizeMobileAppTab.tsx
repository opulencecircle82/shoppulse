"use client";

import { useEffect, useId, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from "react";
import {
  Eye,
  ImageUp,
  Loader2,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Sun,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import type { AppTheme } from "@/lib/hooks/useAppTheme";
import { uploadShopLogo } from "@/lib/dashboard/shopLogo";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import PhoneFrame from "./PhoneFrame";
import {
  CustomerPortalPreview,
  StaffJobListPreview,
  StaffLoginPreview,
  StaffQuotePreview,
  StaffVerificationPreview,
  useSystemPrefersDark,
  type GeofenceMode,
  type PreviewSettings,
} from "./MobileAppPreviews";

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Nunito",
  "Lato",
  "Open Sans",
] as const;

// Always resolves to the most recently published GitHub release's APK —
// one shared app for every shop, themed at runtime per-shop after login.
// Publishing a new release (new features, bug fixes) updates this link
// automatically; no per-shop rebuild needed.
const APP_DOWNLOAD_URL =
  "https://github.com/opulencecircle82/shoppulse-mobile/releases/latest/download/app-release.apk";

// Same pattern, separate repo: the customer app is a plain WebView
// wrapper with no per-shop native logic, so one shared APK works for
// every shop's customers too.
const CUSTOMER_APP_DOWNLOAD_URL =
  "https://github.com/opulencecircle82/shoppulse-customer/releases/latest/download/app-release.apk";

const THEME_OPTIONS: { id: AppTheme; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light Mode", hint: "Bright screens", icon: Sun },
  { id: "dark", label: "Dark Mode", hint: "Easy on the eyes", icon: Moon },
  { id: "auto", label: "Auto System", hint: "Follows the phone", icon: Monitor },
];

// The two choices owners actually pick between, plus "Custom" for a radius
// set by hand in Business Settings so this page never silently overwrites it.
const STRICT_METERS = 50;
const STANDARD_METERS = 100;

function initialGeofenceMode(shop: Shop): GeofenceMode {
  if (!shop.geofence_enforced) return "off";
  if (shop.geofence_radius_meters === STRICT_METERS) return "strict";
  if (shop.geofence_radius_meters === STANDARD_METERS) return "standard";
  return "custom";
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-3 divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export default function CustomizeMobileAppTab({
  shop,
  onSaved,
}: {
  shop: Shop;
  onSaved: () => void;
}) {
  // Branding & media
  const [logoUrl, setLogoUrl] = useState(shop.logo_url ?? "");
  const [theme, setTheme] = useState<AppTheme>(shop.mobile_app_theme);
  const [primaryColor, setPrimaryColor] = useState(shop.primary_color_hex);
  const [accentColor, setAccentColor] = useState(shop.accent_color_hex);
  const [fontFamily, setFontFamily] = useState(shop.mobile_app_font_family);
  // Workflow & security
  const [requirePhotos, setRequirePhotos] = useState(shop.require_before_after_photos);
  const [liveCameraOnly, setLiveCameraOnly] = useState(shop.mandatory_live_camera);
  const [requireSignature, setRequireSignature] = useState(shop.require_customer_signature);
  const [geofenceMode, setGeofenceMode] = useState<GeofenceMode>(() => initialGeofenceMode(shop));
  // Permissions & privacy
  const [showPrices, setShowPrices] = useState(shop.show_job_prices_to_techs);
  const [allowAdditions, setAllowAdditions] = useState(shop.allow_onsite_quote_additions);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<"staff" | "customer">("staff");
  const [bookingLinkCopied, setBookingLinkCopied] = useState(false);
  const logoInputId = useId();
  const systemPrefersDark = useSystemPrefersDark();

  function copyBookingLink() {
    const link = `${window.location.origin}/customer/book/${shop.slug}`;
    navigator.clipboard.writeText(link);
    setBookingLinkCopied(true);
    setTimeout(() => setBookingLinkCopied(false), 2000);
  }

  useEffect(() => {
    const linkId = "mobile-app-font-preview";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      fontFamily
    )}:wght@400;600;700&display=swap`;
  }, [fontFamily]);

  async function handleLogoFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      setLogoUrl(await uploadShopLogo(shop.id, file));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not upload the logo.");
    } finally {
      setUploading(false);
    }
  }

  function handleLogoInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleLogoFile(file);
    event.target.value = "";
  }

  function handleLogoDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  }

  function geofenceUpdate() {
    switch (geofenceMode) {
      case "strict":
        return { geofence_enforced: true, geofence_radius_meters: STRICT_METERS };
      case "standard":
        return { geofence_enforced: true, geofence_radius_meters: STANDARD_METERS };
      case "custom":
        return { geofence_enforced: true };
      case "off":
        // Keep the stored radius so switching back on restores it.
        return { geofence_enforced: false };
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("shops")
      .update({
        logo_url: logoUrl || null,
        mobile_app_theme: theme,
        primary_color_hex: primaryColor,
        accent_color_hex: accentColor,
        mobile_app_font_family: fontFamily,
        require_before_after_photos: requirePhotos,
        mandatory_live_camera: liveCameraOnly,
        require_customer_signature: requireSignature,
        ...geofenceUpdate(),
        show_job_prices_to_techs: showPrices,
        allow_onsite_quote_additions: allowAdditions,
      })
      .eq("id", shop.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    onSaved();
  }

  const dark = theme === "dark" || (theme === "auto" && systemPrefersDark);
  const preview: PreviewSettings = {
    shopName: shop.shop_name,
    logoUrl,
    primaryColor,
    accentColor,
    fontFamily,
    dark,
    requirePhotos,
    liveCameraOnly,
    requireSignature,
    geofenceMode,
    geofenceMeters:
      geofenceMode === "strict"
        ? STRICT_METERS
        : geofenceMode === "standard"
          ? STANDARD_METERS
          : shop.geofence_radius_meters,
    showPrices,
    allowAdditions,
    currency: shop.currency,
  };

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Customize Mobile App
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Branding, rules and privacy for the technician app and the job page your customers see.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200/70 p-4 shadow-md shadow-slate-900/5">
        <div>
          <p className="text-sm font-semibold text-slate-900">Technician App (Android)</p>
          <p className="mt-0.5 text-xs text-slate-500">
            One shared app for every shop &mdash; it reads your saved settings the moment a
            technician logs in. New app features and fixes ship as updates to this same link,
            no separate build per shop.
          </p>
        </div>
        <a
          href={APP_DOWNLOAD_URL}
          className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          <Smartphone className="h-4 w-4" />
          Download App
        </a>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200/70 p-4 shadow-md shadow-slate-900/5">
        <div>
          <p className="text-sm font-semibold text-slate-900">Customer App &amp; Booking Link</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Customers create an account, request jobs, and track everything they&apos;ve booked
            with you — either from the app, or straight from the link (post it on Facebook, your
            website, wherever).
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={copyBookingLink}
            className="flex items-center gap-2 rounded-full border border-brand-blue/40 px-5 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-sky/10"
          >
            {bookingLinkCopied ? "Link copied!" : "Copy Booking Link"}
          </button>
          <a
            href={CUSTOMER_APP_DOWNLOAD_URL}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
          >
            <Smartphone className="h-4 w-4" />
            Download App
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Section
          icon={Palette}
          title="Branding & Media"
          description="Your logo, look and colors across the technician app, photo watermarks and the customer's job page."
        >
          <div className="py-3.5">
            <p className="text-sm font-medium text-slate-900">Business Logo</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Shown in the technician app header and stamped on job photos (when &quot;Show
              logo&quot; is on in Proof-of-Work Branding). PNG or JPG, under 2MB.
            </p>
            <input
              id={logoInputId}
              type="file"
              accept="image/*"
              hidden
              onChange={handleLogoInput}
            />
            {logoUrl ? (
              <div className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Business logo"
                  className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 object-cover"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={logoInputId}
                    className="cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue"
                  >
                    {uploading ? "Uploading..." : "Replace logo"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    aria-label="Remove logo"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor={logoInputId}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleLogoDrop}
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
                  dragActive
                    ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                    : "border-slate-300 text-slate-500 hover:border-brand-blue hover:text-brand-blue"
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImageUp className="h-5 w-5" />
                )}
                {uploading ? "Uploading..." : "Drag & drop your logo, or click to browse"}
              </label>
            )}
            {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
          </div>

          <div className="py-3.5">
            <p className="text-sm font-medium text-slate-900">Default Theme</p>
            <p className="mt-0.5 text-xs text-slate-500">
              The look of the technician app and of the job page your customers open. Auto follows
              each phone&apos;s own light/dark setting.
            </p>
            <div role="radiogroup" aria-label="Default theme" className="mt-3 grid gap-2 sm:grid-cols-3">
              {THEME_OPTIONS.map((option) => {
                const selected = theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(option.id)}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      selected
                        ? "border-brand-blue bg-brand-blue/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        selected ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <option.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="block text-xs text-slate-500">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3.5 sm:max-w-md">
            <div>
              <label className="block text-xs font-medium text-slate-500">Primary Color</label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
                <span className="text-xs text-slate-500">{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Accent Color</label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
                <span className="text-xs text-slate-500">{accentColor}</span>
              </div>
            </div>
          </div>

          <div className="py-3.5 sm:max-w-md">
            <label className="block text-xs font-medium text-slate-500">App Font</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:light]"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section
          icon={Workflow}
          title="Workflow & Security Protocols"
          description="What a technician must do before a job can be started or finished."
        >
          <SettingRow
            title="Mandatory Before & After Photos"
            description="A technician can't start or complete a job without a photo. Turn off to make photos optional."
            control={
              <ToggleSwitch
                checked={requirePhotos}
                onChange={setRequirePhotos}
                label="Mandatory before and after photos"
              />
            }
          />
          <SettingRow
            title="Require Live Camera Capture Only"
            description="Opens the camera directly and blocks choosing photos from the gallery, to prevent fake proof."
            control={
              <ToggleSwitch
                checked={liveCameraOnly}
                onChange={setLiveCameraOnly}
                label="Live camera capture only"
              />
            }
          />
          <SettingRow
            title="Require Customer Digital Signature"
            description="The customer signs on the technician's screen before the job can be completed."
            control={
              <ToggleSwitch
                checked={requireSignature}
                onChange={setRequireSignature}
                label="Require customer digital signature"
              />
            }
          />
          <SettingRow
            title="Geofence Distance Requirement"
            description="How close to the job site a technician must be to start or finish a job."
            control={
              <select
                value={geofenceMode}
                onChange={(e) => setGeofenceMode(e.target.value as GeofenceMode)}
                aria-label="Geofence distance requirement"
                className="w-full min-w-[190px] rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:light]"
              >
                <option value="strict">Strict ({STRICT_METERS} meters)</option>
                <option value="standard">Standard ({STANDARD_METERS} meters)</option>
                {initialGeofenceMode(shop) === "custom" && (
                  <option value="custom">Custom ({shop.geofence_radius_meters} meters)</option>
                )}
                <option value="off">Off</option>
              </select>
            }
          />
        </Section>

        <Section
          icon={ShieldCheck}
          title="Permissions & Privacy"
          description="What field technicians are allowed to see and do in their app."
        >
          <SettingRow
            title="Show Job Prices & Revenue to Techs"
            description="Off hides quote amounts, invoice totals, part prices and job earnings from technicians."
            control={
              <ToggleSwitch
                checked={showPrices}
                onChange={setShowPrices}
                label="Show job prices and revenue to technicians"
              />
            }
          />
          <SettingRow
            title="Allow On-Site Quote Additions"
            description="Lets technicians add parts and extra labor to a quote from their app. Off sends only the standard estimate."
            control={
              <ToggleSwitch
                checked={allowAdditions}
                onChange={setAllowAdditions}
                label="Allow on-site quote additions"
              />
            }
          />
        </Section>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 sm:max-w-md">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald-dark sm:max-w-md">
            Saved &mdash; technicians get the changes within about 20 seconds while their app is
            open, or the next time they open it.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save App Settings"}
        </button>
      </form>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Eye className="h-3.5 w-3.5" /> Live Preview
          </p>
          <div className="inline-flex rounded-full border border-slate-300 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setPreviewTarget("staff")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                previewTarget === "staff"
                  ? "bg-brand-blue text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Staff App
            </button>
            <button
              type="button"
              onClick={() => setPreviewTarget("customer")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                previewTarget === "customer"
                  ? "bg-brand-blue text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Customer Portal
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {previewTarget === "staff"
            ? "What your technicians see on their phones. It updates as you change the settings above — before you save."
            : "What clients see when they open the job link you send them (sent via web link, opened on their phone — not a separate app)."}
          {theme === "auto" && ` Auto is showing ${dark ? "dark" : "light"} because that's this device's setting.`}
        </p>

        <div className="mt-4 flex gap-5 overflow-x-auto pb-4">
          {previewTarget === "staff" ? (
            <>
              <PhoneFrame label="1. Sign In">
                <StaffLoginPreview s={preview} />
              </PhoneFrame>
              <PhoneFrame label="2. Assigned Jobs">
                <StaffJobListPreview s={preview} />
              </PhoneFrame>
              <PhoneFrame label="3. Job Verification">
                <StaffVerificationPreview s={preview} />
              </PhoneFrame>
              <PhoneFrame label="4. On-Site Estimate">
                <StaffQuotePreview s={preview} />
              </PhoneFrame>
            </>
          ) : (
            <PhoneFrame label="Client Job Link">
              <CustomerPortalPreview s={preview} />
            </PhoneFrame>
          )}
        </div>
      </div>
    </div>
  );
}
