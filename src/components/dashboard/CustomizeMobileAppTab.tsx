"use client";

import { useState } from "react";
import Link from "next/link";
import { Palette, Smartphone } from "lucide-react";
import type { Shop } from "@/lib/supabase/types";

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

/**
 * The mobile-app tab: where to get the apps, and the way into the App
 * Builder (/dashboard/mobile-app) where the technician app is customized —
 * a page of its own with a live preview, the same way the business website
 * is customized on /dashboard/website.
 */
export default function CustomizeMobileAppTab({ shop }: { shop: Shop; onSaved?: () => void }) {
  const [bookingLinkCopied, setBookingLinkCopied] = useState(false);

  function copyBookingLink() {
    const link = `${window.location.origin}/customer/book/${shop.slug}`;
    navigator.clipboard.writeText(link);
    setBookingLinkCopied(true);
    setTimeout(() => setBookingLinkCopied(false), 2000);
  }

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Customize Mobile App
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        The technician app has the same functions for every shop. Make it yours: your colors, logo and
        font, your own welcome message and announcements, and your rules.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Palette className="h-4 w-4 text-brand-blue" />
            Customize Tech App
          </p>
          <p className="mt-1 max-w-xl text-xs text-slate-600">
            Opens the App Builder — change colors and font, add your logo, write a welcome message,
            announcement, office phone and job reminder, and set photo, signature, geofence and privacy
            rules. A live preview shows the real app screens as you go.
          </p>
        </div>
        <Link
          href="/dashboard/mobile-app"
          className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          <Palette className="h-4 w-4" />
          Open App Builder
        </Link>
      </div>

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
          className="flex shrink-0 items-center gap-2 rounded-full border border-brand-blue/40 px-5 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-sky/10"
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
            className="flex items-center gap-2 rounded-full border border-brand-blue/40 px-5 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-sky/10"
          >
            <Smartphone className="h-4 w-4" />
            Download App
          </a>
        </div>
      </div>
    </div>
  );
}
