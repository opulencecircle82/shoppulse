"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop, StaffMember } from "@/lib/supabase/types";
import type { DashboardTabId } from "./DashboardSidebarNav";
import WorkingHoursPanel from "./settings/WorkingHoursPanel";

const LocationPickerMap = dynamic(() => import("@/components/shared/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="h-[260px] rounded-xl bg-slate-50" />,
});

/** Other parts of the dashboard (the Home checklist) ask the LIVE button to open a step with this event. */
export const GO_LIVE_EVENT = "shoppulse:go-live";

type Step = "hours" | "location" | "technician" | "receiving";

type ReceivingSettings = {
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  paypal_email: string | null;
  payment_qr_url: string | null;
};

type ShopSetup = Pick<
  Shop,
  "is_publicly_listed" | "business_hours_open" | "business_hours_close" | "business_days" | "latitude" | "longitude"
>;

export function hasWorkingSchedule(
  shop: Pick<Shop, "business_hours_open" | "business_hours_close" | "business_days">
): boolean {
  return Boolean(shop.business_hours_open && shop.business_hours_close && shop.business_days.length > 0);
}

/** The shop's own pin on the map — what customers and technicians navigate by, and what the customer's tracking map shows. */
export function hasBusinessLocation(shop: Pick<Shop, "latitude" | "longitude">): boolean {
  return shop.latitude !== null && shop.longitude !== null;
}

/** A real street address and a map pin — required in Company Profile since customers and technicians both
 * navigate by it, and a shop created without going through that form (e.g. a devside test account) can
 * otherwise sit with neither forever. */
export function hasCompanyProfile(shop: Pick<Shop, "address" | "latitude" | "longitude">): boolean {
  return Boolean(shop.address?.trim()) && hasBusinessLocation(shop);
}

/** A shop is LIVE when it is listed for customers, has told them when it works, and has pinned where it is. */
export function isShopLive(shop: ShopSetup): boolean {
  return shop.is_publicly_listed && hasWorkingSchedule(shop) && hasBusinessLocation(shop);
}

/** Someone has to actually be dispatchable before customers can book — a deactivated-only staff list doesn't count. */
export function hasActiveTechnician(staff: Pick<StaffMember, "role" | "is_active">[]): boolean {
  return staff.some((s) => s.role === "TECHNICIAN" && s.is_active);
}

/** At least one real way for a customer to actually send money — otherwise picking a non-cash payment
 * method in Payment Methods leads nowhere. Any one of bank details, PayPal or a QR code is enough. */
export function hasReceivingPaymentInfo(settings: ReceivingSettings | null): boolean {
  if (!settings) return false;
  const hasBank = Boolean(settings.bank_name || settings.bank_account_name || settings.bank_account_number);
  return hasBank || Boolean(settings.paypal_email) || Boolean(settings.payment_qr_url);
}

/**
 * The owner's LIVE switch, in the dashboard header. Not live: a "Go LIVE" button that walks the owner
 * through whatever is missing, in order — working days and hours, the business location on the map, at
 * least one active technician, then at least one real way to receive payments (bank, PayPal or a QR
 * code) — and goes live the moment the last one is done. Both newer checks (technician, receiving) are
 * checked only on the way to going live and never retroactively take an already-live shop offline. Live:
 * a green "LIVE NOW" badge whose menu edits hours or location, or takes the business offline.
 */
export default function GoLiveButton({
  shop,
  staff,
  onSelectTab,
  onChanged,
}: {
  shop: Shop;
  staff: StaffMember[];
  onSelectTab: (tab: DashboardTabId) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [receiving, setReceiving] = useState<ReceivingSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSchedule = hasWorkingSchedule(shop);
  const hasLocation = hasBusinessLocation(shop);
  const hasTechnician = hasActiveTechnician(staff);
  const hasReceiving = hasReceivingPaymentInfo(receiving);
  const live = isShopLive(shop);

  // A small self-contained read, same pattern as the Home checklist's own service count —
  // nothing else on this page already loads business_settings.
  useEffect(() => {
    let active = true;
    supabase
      .from("business_settings")
      .select("bank_name, bank_account_name, bank_account_number, paypal_email, payment_qr_url")
      .eq("shop_id", shop.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setReceiving(data as ReceivingSettings | null);
      });
    return () => {
      active = false;
    };
  }, [shop.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openStep(next: Step) {
    setError(null);
    setPin(shop.latitude !== null && shop.longitude !== null ? { lat: shop.latitude, lng: shop.longitude } : null);
    setMenuOpen(false);
    setStep(next);
  }

  // The Home checklist's "Set hours" / "Set location" open the same steps.
  useEffect(() => {
    function handleOpen(event: Event) {
      const wanted = (event as CustomEvent<Step>).detail;
      if (wanted === "hours" || wanted === "location" || wanted === "technician" || wanted === "receiving")
        openStep(wanted);
    }
    window.addEventListener(GO_LIVE_EVENT, handleOpen);
    return () => window.removeEventListener(GO_LIVE_EVENT, handleOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.latitude, shop.longitude]);

  /** Returns whether it worked, so a form can stay open on a failure. */
  async function update(fields: Partial<Pick<Shop, "is_publicly_listed" | "latitude" | "longitude">>): Promise<boolean> {
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.from("shops").update(fields).eq("id", shop.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    onChanged();
    return true;
  }

  // Whatever's still missing, checked in this fixed order — null once nothing is.
  function nextGap(): Step | null {
    if (!hasSchedule) return "hours";
    if (!hasLocation) return "location";
    if (!hasTechnician) return "technician";
    if (!hasReceiving) return "receiving";
    return null;
  }

  async function handleHoursSaved() {
    // Already live — editing hours never re-triggers the setup gate.
    if (live) {
      setStep(null);
      return;
    }
    const gap = !hasLocation ? "location" : !hasTechnician ? "technician" : !hasReceiving ? "receiving" : null;
    if (gap) {
      setStep(gap);
      onChanged();
      return;
    }
    if (await update({ is_publicly_listed: true })) setStep(null);
  }

  async function handleLocationSave() {
    if (!pin) {
      setError("Tap the map or use your current location to drop your pin first.");
      return;
    }
    // Already live — editing the pin never re-triggers the setup gate.
    if (live) {
      if (await update({ latitude: pin.lat, longitude: pin.lng })) setStep(null);
      return;
    }
    // Saving the pin completes the setup only if everything else is already there too.
    const willGoLive = hasSchedule && hasTechnician && hasReceiving;
    const fields = willGoLive
      ? { latitude: pin.lat, longitude: pin.lng, is_publicly_listed: true }
      : { latitude: pin.lat, longitude: pin.lng };
    if (await update(fields))
      setStep(!hasSchedule ? "hours" : !hasTechnician ? "technician" : !hasReceiving ? "receiving" : null);
  }

  function handleClick() {
    if (live) {
      setMenuOpen((open) => !open);
      return;
    }
    const gap = nextGap();
    if (gap) openStep(gap);
    else void update({ is_publicly_listed: true });
  }

  const missingHint = !hasSchedule
    ? "Not live yet — set your working days to go live."
    : !hasLocation
      ? "Not live yet — pin your business on the map to go live."
      : !hasTechnician
        ? "Not live yet — add at least one technician to go live."
        : !hasReceiving
          ? "Not live yet — add a way to receive payments to go live."
          : "Not live yet — tap to show your business to customers.";

  const stepTitle =
    step === "hours"
      ? "Please input your working days"
      : step === "location"
        ? "Pin your business on the map"
        : step === "technician"
          ? "Add at least one technician"
          : "Add a way to receive payments";

  const stepDescription =
    step === "hours"
      ? live
        ? "Change the days and hours customers see."
        : "Customers need to know when you work before you go live."
      : step === "location"
        ? "Customers follow their technician on a map and see where your shop is. Tap the map or use your current location."
        : step === "technician"
          ? "Someone has to actually be dispatchable before customers can book you — add at least one technician (or yourself, if you also do the jobs) before you go live."
          : "A customer who picks a non-cash payment method needs somewhere real to send it — add your bank account, PayPal or a QR code before you go live.";

  const locationSaveLabel = live
    ? "Save location"
    : !hasSchedule
      ? "Save & continue"
      : hasTechnician && hasReceiving
        ? "Save & go LIVE"
        : "Save & continue";

  return (
    <div className="relative mt-3" ref={containerRef}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-expanded={live ? menuOpen : undefined}
        className={`inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-bold transition-shadow disabled:cursor-not-allowed disabled:opacity-60 ${
          live
            ? "bg-brand-emerald/15 text-brand-emerald-dark ring-1 ring-brand-emerald/30"
            : "bg-gradient-to-r from-red-500 to-brand-orange text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.45)]"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${live ? "animate-pulse bg-brand-emerald" : "bg-white"}`}
          aria-hidden="true"
        />
        {busy && !step ? "Please wait..." : live ? "LIVE NOW" : "Go LIVE"}
      </button>
      {!live && <p className="mt-1.5 text-[11px] text-slate-500">{missingHint}</p>}
      {error && !step && (
        <p role="alert" className="mt-1.5 text-[11px] text-red-600">
          {error}
        </p>
      )}

      {live && menuOpen && (
        <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-2xl bg-white p-3 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
          <p className="text-xs text-slate-600">
            You&apos;re live — customers nearby can find and book you.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => openStep("hours")}
              className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              Edit working days
            </button>
            <button
              type="button"
              onClick={() => openStep("location")}
              className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              Edit business location
            </button>
            <button
              type="button"
              onClick={() => void update({ is_publicly_listed: false }).then(() => setMenuOpen(false))}
              disabled={busy}
              className="rounded-full border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-60"
            >
              Take offline
            </button>
          </div>
        </div>
      )}

      {step && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 sm:px-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{stepTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">{stepDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(null)}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              {step === "hours" ? (
                <WorkingHoursPanel
                  shop={shop}
                  onSaved={handleHoursSaved}
                  submitLabel={
                    live ? "Save Changes" : hasLocation && hasTechnician && hasReceiving ? "Save & go LIVE" : "Save & continue"
                  }
                />
              ) : step === "location" ? (
                <>
                  <LocationPickerMap
                    tone="light"
                    latitude={pin?.lat ?? null}
                    longitude={pin?.lng ?? null}
                    onChange={(lat, lng) => setPin({ lat, lng })}
                    label="Your business location"
                    description="Stand at your shop and tap “Use my current location”, or tap the map where your shop is."
                  />
                  <button
                    type="button"
                    onClick={handleLocationSave}
                    disabled={busy}
                    className="mt-4 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Saving..." : locationSaveLabel}
                  </button>
                </>
              ) : step === "technician" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep(null);
                    onSelectTab("staff");
                  }}
                  className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                >
                  Go to Staff
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStep(null);
                    router.push("/dashboard/settings?tab=receiving");
                  }}
                  className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                >
                  Go to Receiving Payments
                </button>
              )}
            </div>
            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
