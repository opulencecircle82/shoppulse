"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useShop } from "@/lib/hooks/useShop";
import CompanyProfilePanel from "@/components/dashboard/settings/CompanyProfilePanel";
import GeofencePanel from "@/components/dashboard/settings/GeofencePanel";
import StaffPayRatesPanel from "@/components/dashboard/settings/StaffPayRatesPanel";
import WatermarkPanel from "@/components/dashboard/settings/WatermarkPanel";
import WhiteLabelPanel from "@/components/dashboard/settings/WhiteLabelPanel";
import WorkingHoursPanel from "@/components/dashboard/settings/WorkingHoursPanel";
import DefaultTasksPanel from "@/components/dashboard/settings/DefaultTasksPanel";
import PaymentMethodsPanel from "@/components/dashboard/settings/PaymentMethodsPanel";

const TABS = [
  { id: "profile", label: "Company Profile" },
  { id: "hours", label: "Working Hours" },
  { id: "tasks", label: "Default Tasks" },
  { id: "payments", label: "Payment Methods" },
  { id: "geofence", label: "Geofence & Theft Tolerance" },
  { id: "staff", label: "Staff Pay Rates" },
  { id: "watermark", label: "Proof-of-Work Branding" },
  { id: "whitelabel", label: "White-Label & Ad Network" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const ONBOARDING_ORDER: TabId[] = ["profile", "geofence", "staff", "watermark"];

export default function SettingsPage() {
  const router = useRouter();
  const { checked } = useRequireAuth();
  const { loading, shop, staffMember, isOwner, refresh } = useShop();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);

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
          Business settings can only be changed by the shop owner.
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

  function handleProfileSaved(created: boolean) {
    refresh();
    if (created) {
      setOnboardingStep(1);
      setActiveTab(ONBOARDING_ORDER[1]);
    }
  }

  function handleOnboardingContinue() {
    if (onboardingStep === null) return;
    const next = onboardingStep + 1;

    if (next >= ONBOARDING_ORDER.length) {
      setOnboardingStep(null);
      router.push("/dashboard");
      return;
    }

    setOnboardingStep(next);
    setActiveTab(ONBOARDING_ORDER[next]);
  }

  const isOnboarding = onboardingStep !== null;

  return (
    <main className="min-h-screen bg-brand-navy">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Business Settings
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isOnboarding
                ? `Step ${onboardingStep! + 1} of ${ONBOARDING_ORDER.length}: complete your business info so ShopPulse can enforce and calculate accurately.`
                : "Configure your shop profile, geofencing, staff pay, and branding."}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>

        {isOnboarding && (
          <div className="mt-6 flex gap-1.5">
            {ONBOARDING_ORDER.map((id, index) => (
              <div
                key={id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  index <= onboardingStep!
                    ? "bg-brand-emerald"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-blue/15 text-brand-blue"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30 sm:p-8">
            {activeTab === "profile" && (
              <CompanyProfilePanel shop={shop} onSaved={handleProfileSaved} />
            )}
            {activeTab === "hours" && (
              <WorkingHoursPanel shop={shop} onSaved={refresh} />
            )}
            {activeTab === "tasks" && (
              <DefaultTasksPanel shop={shop} onSaved={refresh} />
            )}
            {activeTab === "payments" && (
              <PaymentMethodsPanel shop={shop} onSaved={refresh} />
            )}
            {activeTab === "geofence" && (
              <GeofencePanel
                shop={shop}
                onSaved={refresh}
                showContinue={isOnboarding}
                onContinue={handleOnboardingContinue}
              />
            )}
            {activeTab === "staff" && (
              <StaffPayRatesPanel
                shop={shop}
                onSaved={refresh}
                showContinue={isOnboarding}
                onContinue={handleOnboardingContinue}
              />
            )}
            {activeTab === "watermark" && (
              <WatermarkPanel
                shop={shop}
                onSaved={refresh}
                showContinue={isOnboarding}
                continueLabel="Finish Setup"
                onContinue={handleOnboardingContinue}
              />
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
