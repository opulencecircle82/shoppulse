"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Camera,
  MapPin,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";

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

type ThemeProps = {
  shopName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
};

function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="w-[220px] shrink-0">
      <p className="mb-2 text-center text-[11px] font-medium text-slate-400">
        {label}
      </p>
      <div className="overflow-hidden rounded-[24px] border-4 border-slate-700 bg-black shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function StaffLoginPreview({ shopName, primaryColor, fontFamily }: ThemeProps) {
  return (
    <div style={{ backgroundColor: primaryColor, fontFamily }} className="flex h-[380px] flex-col items-center justify-center gap-3 px-5 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-bold text-white">
        SP
      </span>
      <p className="text-sm font-bold text-white">{shopName || "ShopPulse"}</p>
      <p className="text-[10px] text-white/60">
        Sign in with the Google account your shop owner added you with.
      </p>
      <button
        type="button"
        disabled
        className="mt-2 w-full rounded-full bg-white py-2 text-[10px] font-semibold text-slate-900"
      >
        Continue with Google
      </button>
    </div>
  );
}

function StaffJobListPreview({
  shopName,
  primaryColor,
  accentColor,
  fontFamily,
}: ThemeProps) {
  const jobs = [
    { name: "Apex Property Services", status: "SCHEDULED" },
    { name: "Maria Santos", status: "IN_PROGRESS" },
    { name: "Oakwood HOA", status: "COMPLETED" },
  ];
  return (
    <div className="h-[380px] bg-brand-slate" style={{ fontFamily }}>
      <div
        style={{ backgroundColor: primaryColor }}
        className="px-4 py-3 text-xs font-bold text-white"
      >
        {shopName || "ShopPulse"}
      </div>
      <div className="space-y-2 p-3">
        {jobs.map((job) => (
          <div
            key={job.name}
            className="rounded-lg bg-brand-slate-light/40 p-2.5"
          >
            <p className="text-[11px] font-semibold text-white">{job.name}</p>
            <span
              style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold"
            >
              {job.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffVerificationPreview({
  primaryColor,
  accentColor,
  fontFamily,
}: ThemeProps) {
  return (
    <div style={{ fontFamily }} className="h-[380px] space-y-3 bg-brand-slate p-4">
      <p className="text-xs font-semibold text-slate-300">
        JOB VERIFICATION PROTOCOL
      </p>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          readOnly
          checked
          className="accent-current"
          style={{ accentColor }}
        />
        Tools &amp; Safety Gear Inspected
      </label>
      <button
        type="button"
        disabled
        style={{ backgroundColor: primaryColor }}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white"
      >
        <Camera className="h-3.5 w-3.5" />
        Take Live Photo Proof
      </button>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
        <MapPin className="h-3 w-3" style={{ color: accentColor }} />
        <span style={{ color: accentColor }}>
          GPS Tagged: 37.7749, -122.4194
        </span>
      </div>
      <button
        type="button"
        disabled
        style={{ backgroundColor: accentColor }}
        className="w-full rounded-lg py-2.5 text-xs font-bold text-white"
      >
        CLOCK IN &amp; START JOB
      </button>
    </div>
  );
}

function CustomerPortalPreview({
  shopName,
  primaryColor,
  accentColor,
  fontFamily,
}: ThemeProps) {
  return (
    <div style={{ fontFamily }} className="h-[380px] bg-brand-slate">
      <div
        style={{ backgroundColor: primaryColor }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <ShieldCheck className="h-4 w-4 text-white" />
        <span className="text-[11px] font-bold text-white">
          Job Verification &mdash; {shopName || "ShopPulse"}
        </span>
      </div>
      <div className="space-y-2.5 p-3">
        <p className="text-[10px] text-slate-400">
          Service: Residential Deep Clean
        </p>
        <p className="text-[10px] text-slate-400">
          Time Tracked: 2.5 Hours (14:00 - 16:30)
        </p>
        <p
          style={{ color: accentColor }}
          className="text-[10px] font-semibold"
        >
          ✓ GPS Verified On-Site
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="aspect-square rounded-md bg-brand-slate-light/50" />
          <div className="aspect-square rounded-md bg-brand-slate-light/50" />
        </div>
        <p className="pt-1 text-[11px] font-medium text-white">
          Was this job completed to your satisfaction?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            style={{ backgroundColor: accentColor }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold text-white"
          >
            <CheckCircle2 className="h-3 w-3" />
            Approve
          </button>
          <button
            type="button"
            disabled
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-400/50 py-2 text-[10px] font-bold text-red-400"
          >
            <XCircle className="h-3 w-3" />
            Dispute
          </button>
        </div>
      </div>
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
  const [primaryColor, setPrimaryColor] = useState(shop.primary_color_hex);
  const [accentColor, setAccentColor] = useState(shop.accent_color_hex);
  const [fontFamily, setFontFamily] = useState(shop.mobile_app_font_family);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<"staff" | "customer">(
    "staff"
  );

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
        mobile_app_font_family: fontFamily,
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

  const themeProps: ThemeProps = {
    shopName: shop.shop_name,
    primaryColor,
    accentColor,
    fontFamily,
  };

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Customize Mobile App
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Theme applied to the ShopPulse technician app (Flutter) and the
        client verification portal.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-slate-light/40 p-4 shadow-md shadow-black/20">
        <div>
          <p className="text-sm font-semibold text-white">
            Technician App (Android)
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            One shared app for every shop &mdash; it reads your saved theme
            below the moment a technician logs in. New app features and
            fixes ship as updates to this same link, no separate build per
            shop.
          </p>
        </div>
        <a
          href={APP_DOWNLOAD_URL}
          className="flex shrink-0 items-center gap-2 rounded-full bg-brand-emerald px-5 py-2.5 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)]"
        >
          <Smartphone className="h-4 w-4" />
          Download App
        </a>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Primary Color
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-emerald focus:outline-none"
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
                className="h-9 w-12 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-emerald focus:outline-none"
              />
              <span className="text-xs text-slate-400">{accentColor}</span>
            </div>
          </div>
        </div>

        <div className="sm:max-w-md">
          <label className="block text-xs font-medium text-slate-400">
            App Font
          </label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="mt-1.5 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-emerald focus:outline-none"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400 sm:max-w-md">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald sm:max-w-md">
            Saved &mdash; the technician app will pick this up on next
            launch.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save App Theme"}
        </button>
      </form>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Live Preview
          </p>
          <div className="inline-flex rounded-full border border-slate-700 bg-brand-slate-light/40 p-1">
            <button
              type="button"
              onClick={() => setPreviewTarget("staff")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                previewTarget === "staff"
                  ? "bg-brand-emerald text-brand-slate"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Staff App
            </button>
            <button
              type="button"
              onClick={() => setPreviewTarget("customer")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                previewTarget === "customer"
                  ? "bg-brand-emerald text-brand-slate"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Customer Portal
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {previewTarget === "staff"
            ? "What your technicians see on their phones, from sign-in to job capture."
            : "What clients see when they open the job approval link you send them (sent via web link, opened on their phone — not a separate app)."}
        </p>

        <div className="mt-4 flex gap-5 overflow-x-auto pb-4">
          {previewTarget === "staff" ? (
            <>
              <PhoneFrame label="1. Sign In">
                <StaffLoginPreview {...themeProps} />
              </PhoneFrame>
              <PhoneFrame label="2. Assigned Jobs">
                <StaffJobListPreview {...themeProps} />
              </PhoneFrame>
              <PhoneFrame label="3. Job Verification">
                <StaffVerificationPreview {...themeProps} />
              </PhoneFrame>
            </>
          ) : (
            <PhoneFrame label="Client Approval Link">
              <CustomerPortalPreview {...themeProps} />
            </PhoneFrame>
          )}
        </div>
      </div>
    </div>
  );
}
