"use client";

import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ImageUp,
  Loader2,
  Megaphone,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useShop } from "@/lib/hooks/useShop";
import BuilderPaneToggle, { type BuilderPane } from "@/components/dashboard/BuilderPaneToggle";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import type { AppTheme } from "@/lib/hooks/useAppTheme";
import { uploadShopLogo } from "@/lib/dashboard/shopLogo";
import {
  APP_FONT_OPTIONS,
  STANDARD_FONT,
  UNCHOSEN_ACCENT,
  UNCHOSEN_PRIMARY,
  appFontHref,
} from "@/lib/branding";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import TechAppPreview, { useSystemPrefersDark } from "@/components/dashboard/TechAppPreview";

type GeofenceMode = "strict" | "standard" | "custom" | "off";

const THEME_OPTIONS: { id: AppTheme; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light Mode", hint: "Bright screens", icon: Sun },
  { id: "dark", label: "Dark Mode", hint: "Easy on the eyes", icon: Moon },
  { id: "auto", label: "Auto System", hint: "Follows the phone", icon: Monitor },
];

// "Custom" only appears when the radius was set by hand in Business Settings,
// so saving here never silently overwrites it.
const STRICT_METERS = 50;
const STANDARD_METERS = 100;

function initialGeofenceMode(shop: Shop): GeofenceMode {
  if (!shop.geofence_enforced) return "off";
  if (shop.geofence_radius_meters === STRICT_METERS) return "strict";
  if (shop.geofence_radius_meters === STANDARD_METERS) return "standard";
  return "custom";
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:light]";

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
    <section>
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-2 divide-y divide-slate-100">{children}</div>
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
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function CountedField({
  label,
  hint,
  value,
  max,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  max: number;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="py-3">
      <label className="block text-sm font-medium text-slate-900">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
      )}
      <p className="mt-1 text-right text-[10px] text-slate-400">
        {value.length}/{max}
      </p>
    </div>
  );
}

export default function AppBuilderPage() {
  const { checked } = useRequireAuth();
  const { loading, shop, staffMember, isOwner, refresh } = useShop();

  if (!checked || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (staffMember && !isOwner) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-page px-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Owners only</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          The technician app can only be customized by the shop owner.
        </p>
        <Link href="/dashboard" className="mt-6 text-sm font-medium text-brand-blue hover:text-brand-blue-dark">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-page px-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Set up your shop first</h1>
        <Link href="/dashboard/settings" className="mt-6 text-sm font-medium text-brand-blue hover:text-brand-blue-dark">
          ← Business Settings
        </Link>
      </main>
    );
  }

  return <AppBuilder shop={shop} onSaved={refresh} />;
}

function AppBuilder({ shop, onSaved }: { shop: Shop; onSaved: () => void }) {
  // Branding & media
  const [logoUrl, setLogoUrl] = useState(shop.logo_url ?? "");
  const [theme, setTheme] = useState<AppTheme>(shop.mobile_app_theme);
  const [primaryColor, setPrimaryColor] = useState(shop.primary_color_hex);
  const [accentColor, setAccentColor] = useState(shop.accent_color_hex);
  const [fontFamily, setFontFamily] = useState(shop.mobile_app_font_family);
  // App information
  const [welcome, setWelcome] = useState(shop.mobile_app_welcome ?? "");
  const [announcementTitle, setAnnouncementTitle] = useState(shop.mobile_app_announcement_title ?? "");
  const [announcement, setAnnouncement] = useState(shop.mobile_app_announcement ?? "");
  const [officePhone, setOfficePhone] = useState(shop.mobile_app_office_phone ?? "");
  const [jobReminder, setJobReminder] = useState(shop.mobile_app_job_reminder ?? "");
  // Workflow & security
  const [requirePhotos, setRequirePhotos] = useState(shop.require_before_after_photos);
  const [liveCameraOnly, setLiveCameraOnly] = useState(shop.mandatory_live_camera);
  const [requireSignature, setRequireSignature] = useState(shop.require_customer_signature);
  const [geofenceMode, setGeofenceMode] = useState<GeofenceMode>(() => initialGeofenceMode(shop));
  // Permissions & privacy
  const [showPrices, setShowPrices] = useState(shop.show_job_prices_to_techs);
  const [allowAdditions, setAllowAdditions] = useState(shop.allow_onsite_quote_additions);

  const [pane, setPane] = useState<BuilderPane>("edit");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const logoInputId = useId();
  const systemPrefersDark = useSystemPrefersDark();

  // Load the chosen font so the preview shows it.
  useEffect(() => {
    const href = appFontHref(fontFamily);
    if (!href) return;
    const linkId = "app-builder-font-preview";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [fontFamily]);

  function resetForm() {
    setLogoUrl(shop.logo_url ?? "");
    setTheme(shop.mobile_app_theme);
    setPrimaryColor(shop.primary_color_hex);
    setAccentColor(shop.accent_color_hex);
    setFontFamily(shop.mobile_app_font_family);
    setWelcome(shop.mobile_app_welcome ?? "");
    setAnnouncementTitle(shop.mobile_app_announcement_title ?? "");
    setAnnouncement(shop.mobile_app_announcement ?? "");
    setOfficePhone(shop.mobile_app_office_phone ?? "");
    setJobReminder(shop.mobile_app_job_reminder ?? "");
    setRequirePhotos(shop.require_before_after_photos);
    setLiveCameraOnly(shop.mandatory_live_camera);
    setRequireSignature(shop.require_customer_signature);
    setGeofenceMode(initialGeofenceMode(shop));
    setShowPrices(shop.show_job_prices_to_techs);
    setAllowAdditions(shop.allow_onsite_quote_additions);
    setSuccess(false);
    setError(null);
  }

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
        mobile_app_welcome: blankToNull(welcome),
        mobile_app_announcement_title: blankToNull(announcementTitle),
        mobile_app_announcement: blankToNull(announcement),
        mobile_app_office_phone: blankToNull(officePhone),
        mobile_app_job_reminder: blankToNull(jobReminder),
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

  // The saved shop with every unsaved choice laid over it — exactly what the
  // real app will read once this is saved.
  const previewShop: Shop = {
    ...shop,
    logo_url: logoUrl || null,
    mobile_app_theme: theme,
    primary_color_hex: primaryColor,
    accent_color_hex: accentColor,
    mobile_app_font_family: fontFamily,
    mobile_app_welcome: blankToNull(welcome),
    mobile_app_announcement_title: blankToNull(announcementTitle),
    mobile_app_announcement: blankToNull(announcement),
    mobile_app_office_phone: blankToNull(officePhone),
    mobile_app_job_reminder: blankToNull(jobReminder),
    require_before_after_photos: requirePhotos,
    mandatory_live_camera: liveCameraOnly,
    require_customer_signature: requireSignature,
    geofence_enforced: geofenceMode !== "off",
    geofence_radius_meters:
      geofenceMode === "strict"
        ? STRICT_METERS
        : geofenceMode === "standard"
          ? STANDARD_METERS
          : shop.geofence_radius_meters,
    show_job_prices_to_techs: showPrices,
    allow_onsite_quote_additions: allowAdditions,
  };

  const colorsAreStandard =
    primaryColor.toUpperCase() === UNCHOSEN_PRIMARY && accentColor.toUpperCase() === UNCHOSEN_ACCENT;

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 transition-colors hover:text-slate-900" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold text-white">
            SP
          </span>
          <h1 className="shrink-0 text-base font-bold text-slate-900">Customize Tech App</h1>
          <span className="hidden truncate text-sm text-slate-500 sm:inline">{shop.shop_name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
          <button
            type="submit"
            form="app-builder-form"
            disabled={saving || uploading}
            className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <a
            href="/tech"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-brand-emerald/15 px-5 py-2 text-xs font-semibold text-brand-emerald-dark transition-colors hover:bg-brand-emerald/25"
          >
            Open Tech App →
          </a>
        </div>
      </header>

      <BuilderPaneToggle pane={pane} onChange={setPane} />

      {(error || success) && (
        <div className="shrink-0 space-y-2 border-b border-slate-200 px-5 py-3">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald-dark">
              Saved — technicians get the changes within about 20 seconds while their app is open, or
              the next time they open it.
            </p>
          )}
        </div>
      )}

      <div className="grid flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden md:grid-cols-[400px_1fr]">
        <form
          id="app-builder-form"
          onSubmit={handleSubmit}
          className={`space-y-8 overflow-y-auto border-b border-slate-200 p-5 md:block md:border-b-0 md:border-r ${
            pane === "edit" ? "" : "hidden"
          }`}
        >
          <Section
            icon={Palette}
            title="Branding & Media"
            description="Your logo, colors, font and look. The app keeps all its functions — only its dressing changes."
          >
            <div className="py-3">
              <p className="text-sm font-medium text-slate-900">Business Logo</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Shown in the app header and stamped on job photos (when &quot;Show logo&quot; is on in
                Proof-of-Work Branding). Under 2MB.
              </p>
              <input id={logoInputId} type="file" accept="image/*" hidden onChange={handleLogoInput} />
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
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageUp className="h-5 w-5" />}
                  {uploading ? "Uploading..." : "Drag & drop your logo, or click to browse"}
                </label>
              )}
              {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
            </div>

            <div className="py-3">
              <p className="text-sm font-medium text-slate-900">Default Theme</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Auto follows each phone&apos;s own light/dark setting.
              </p>
              <div role="radiogroup" aria-label="Default theme" className="mt-3 grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((option) => {
                  const selected = theme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setTheme(option.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
                        selected ? "border-brand-blue bg-brand-blue/5" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          selected ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <option.icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-semibold text-slate-900">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="py-3">
              <p className="text-sm font-medium text-slate-900">Colors</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Primary colors the main buttons and highlights; Accent colors navigation and links.
                A color that would be hard to read is adjusted automatically.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4">
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
              <button
                type="button"
                onClick={() => {
                  setPrimaryColor(UNCHOSEN_PRIMARY);
                  setAccentColor(UNCHOSEN_ACCENT);
                }}
                disabled={colorsAreStandard}
                className="mt-3 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark disabled:cursor-default disabled:text-slate-400"
              >
                {colorsAreStandard ? "Using the standard ShopPulse colors" : "Use the standard ShopPulse colors"}
              </button>
            </div>

            <div className="py-3">
              <label className="block text-sm font-medium text-slate-900">App Font</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className={fieldClass}
              >
                {APP_FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font === STANDARD_FONT ? "Standard (ShopPulse)" : font}
                  </option>
                ))}
              </select>
            </div>
          </Section>

          <Section
            icon={Megaphone}
            title="App Information"
            description="Add your own words to the app. Anything you leave blank simply doesn't appear."
          >
            <CountedField
              label="Welcome Message"
              hint="Shown at the top of every technician's home screen."
              value={welcome}
              max={300}
              rows={3}
              onChange={setWelcome}
              placeholder="e.g. Good morning team — drive safe and take photos of every job!"
            />
            <CountedField
              label="Announcement Title"
              value={announcementTitle}
              max={80}
              onChange={setAnnouncementTitle}
              placeholder="e.g. Schedule change this Friday"
            />
            <CountedField
              label="Announcement"
              hint="A highlighted notice under the welcome message."
              value={announcement}
              max={600}
              rows={3}
              onChange={setAnnouncement}
              placeholder="What do you want everyone to know?"
            />
            <CountedField
              label="Office Phone"
              hint="Adds a Call the office button to the home screen and every job."
              value={officePhone}
              max={40}
              onChange={setOfficePhone}
              placeholder="e.g. 0917 123 4567"
            />
            <CountedField
              label="Reminder On Every Job"
              hint="A standing reminder at the top of each job — safety rules, how to greet customers..."
              value={jobReminder}
              max={400}
              rows={3}
              onChange={setJobReminder}
              placeholder="e.g. Wear safety shoes, greet the customer, and clean up before you leave."
            />
          </Section>

          <Section
            icon={Workflow}
            title="Workflow & Security Protocols"
            description="What a technician must do before a job can be started or finished."
          >
            <SettingRow
              title="Mandatory Before & After Photos"
              description="No photo, no start or finish. Off makes photos optional."
              control={<ToggleSwitch checked={requirePhotos} onChange={setRequirePhotos} label="Mandatory before and after photos" />}
            />
            <SettingRow
              title="Require Live Camera Capture Only"
              description="Opens the camera and blocks the gallery, to prevent fake proof."
              control={<ToggleSwitch checked={liveCameraOnly} onChange={setLiveCameraOnly} label="Live camera capture only" />}
            />
            <SettingRow
              title="Require Customer Digital Signature"
              description="The customer signs on the technician's screen to complete a job."
              control={<ToggleSwitch checked={requireSignature} onChange={setRequireSignature} label="Require customer digital signature" />}
            />
            <SettingRow
              title="Geofence Distance Requirement"
              description="How close to the job site a technician must be to start or finish."
              control={
                <select
                  value={geofenceMode}
                  onChange={(e) => setGeofenceMode(e.target.value as GeofenceMode)}
                  aria-label="Geofence distance requirement"
                  className="w-full min-w-[150px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:light]"
                >
                  <option value="strict">Strict ({STRICT_METERS} m)</option>
                  <option value="standard">Standard ({STANDARD_METERS} m)</option>
                  {initialGeofenceMode(shop) === "custom" && (
                    <option value="custom">Custom ({shop.geofence_radius_meters} m)</option>
                  )}
                  <option value="off">Off</option>
                </select>
              }
            />
          </Section>

          <Section
            icon={ShieldCheck}
            title="Permissions & Privacy"
            description="What field technicians are allowed to see and do."
          >
            <SettingRow
              title="Show Job Prices & Revenue to Techs"
              description="Off hides quote amounts, totals, part prices and earnings."
              control={<ToggleSwitch checked={showPrices} onChange={setShowPrices} label="Show job prices and revenue to technicians" />}
            />
            <SettingRow
              title="Allow On-Site Quote Additions"
              description="Lets technicians add parts and extra labor to a quote. Off sends only the standard estimate."
              control={<ToggleSwitch checked={allowAdditions} onChange={setAllowAdditions} label="Allow on-site quote additions" />}
            />
          </Section>

        </form>

        <div className={`overflow-y-auto bg-slate-100 p-4 sm:p-6 md:block ${pane === "preview" ? "" : "hidden"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Preview</p>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            These are the real technician screens with sample jobs, so what you see is what your team
            gets. It updates as you change things on the left — before you save.
            {theme === "auto" && ` Auto is showing ${dark ? "dark" : "light"} because that's this device's setting.`}
          </p>
          <div className="mt-5">
            <TechAppPreview shop={previewShop} dark={dark} />
          </div>
        </div>
      </div>
    </main>
  );
}
