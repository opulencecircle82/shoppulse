"use client";

import { useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useShop } from "@/lib/hooks/useShop";
import CompanyProfilePanel from "@/components/dashboard/settings/CompanyProfilePanel";
import GeofencePanel from "@/components/dashboard/settings/GeofencePanel";
import StaffPayRatesPanel from "@/components/dashboard/settings/StaffPayRatesPanel";
import WatermarkPanel from "@/components/dashboard/settings/WatermarkPanel";
import WhiteLabelPanel from "@/components/dashboard/settings/WhiteLabelPanel";

const TABS = [
  { id: "profile", label: "Company Profile" },
  { id: "geofence", label: "Geofence & Theft Tolerance" },
  { id: "staff", label: "Staff Pay Rates" },
  { id: "watermark", label: "Proof-of-Work Branding" },
  { id: "whitelabel", label: "White-Label & Ad Network" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const { checked } = useRequireAuth();
  const { loading, shop, staffMember, isOwner, refresh } = useShop();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  if (!checked || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-slate">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-emerald border-t-transparent" />
      </main>
    );
  }

  if (staffMember && !isOwner) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-slate px-6 text-center">
        <h1 className="text-xl font-semibold text-white">Owners only</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          Business settings can only be changed by the shop owner.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 text-sm font-medium text-brand-emerald hover:text-emerald-400"
        >
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-slate">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Business Settings
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Configure your shop profile, geofencing, staff pay, and
              branding.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-emerald/15 text-brand-emerald"
                    : "text-slate-400 hover:bg-brand-slate-light/40 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="rounded-2xl border border-slate-700 bg-brand-slate-light/30 p-6 sm:p-8">
            {activeTab === "profile" && (
              <CompanyProfilePanel shop={shop} onSaved={refresh} />
            )}
            {activeTab === "geofence" && (
              <GeofencePanel shop={shop} onSaved={refresh} />
            )}
            {activeTab === "staff" && <StaffPayRatesPanel shop={shop} />}
            {activeTab === "watermark" && (
              <WatermarkPanel shop={shop} onSaved={refresh} />
            )}
            {activeTab === "whitelabel" && (
              <WhiteLabelPanel shop={shop} onSaved={refresh} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
