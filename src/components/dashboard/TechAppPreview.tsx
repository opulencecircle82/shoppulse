"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import type { JobTicket, Shop } from "@/lib/supabase/types";
import type { StaffContext } from "@/lib/tech/staffContext";
import TechHomeScreen from "@/components/tech/TechHomeScreen";
import TechJobScreen from "@/components/tech/TechJobScreen";
import TechBottomNav from "@/components/tech/TechBottomNav";
import { brandStyle } from "@/lib/branding";
import PhoneFrame from "./PhoneFrame";

/*
 * The App Builder's preview shows the REAL technician screens (the same
 * components the technicians use) filled with sample jobs, so what the owner
 * sees is what their team gets — it can't drift out of sync the way a hand-drawn
 * mock-up would. Each screen is laid out at a normal 390px phone width and
 * shrunk to fit its frame; the shop's unsaved colours, font, theme, information
 * and rules are applied to it exactly as they will be in the real app.
 */

const SCREEN_W = 390;
const SCREEN_H = 760;
const FRAME_W = 212; // PhoneFrame is 220px wide with a 4px border
const SCALE = FRAME_W / SCREEN_W;

const noop = () => {};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const SAMPLE_STAFF: StaffContext = {
  staffId: "sample-tech",
  shopId: "sample-shop",
  role: "TECHNICIAN",
  locationToken: "sample",
  fullName: "Juan Dela Cruz",
  email: "juan@example.com",
  phone: null,
  avatarUrl: null,
  isClockedIn: true,
  isNightShift: false,
};

function sampleJob(overrides: Partial<JobTicket>): JobTicket {
  return {
    id: "sample-job",
    shop_id: "sample-shop",
    job_number: 12,
    assigned_staff_id: "sample-tech",
    client_name: "Maria Santos",
    client_email: "maria@example.com",
    client_phone: "0917 555 0142",
    service_address: "45 Rizal St, Kidapawan City",
    service_type: "Kitchen faucet repair",
    description: "The faucet keeps dripping and water pools under the sink.",
    status: "SCHEDULED",
    start_checklist: ["Wear gloves and safety shoes", "Confirm the job with the customer"],
    end_checklist: ["Clean the work area", "Test that nothing leaks"],
    start_photo_url: null,
    end_photo_url: null,
    started_at: null,
    completed_at: null,
    quote_submitted_at: null,
    quote_approved_at: null,
    total_invoice_amount: 0,
    service_fee: 0,
    total_labor_cost: 0,
    selected_products: [],
    payment_status: "UNPAID",
    payment_verified_at: null,
    payment_verified_amount: 0,
    discount_percent: null,
    booking_latitude: null,
    booking_longitude: null,
    staff_accepted_at: hoursAgo(2),
    en_route_at: null,
    created_at: hoursAgo(5),
    is_emergency: false,
    ...overrides,
  } as unknown as JobTicket;
}

const HOME_TASK = sampleJob({});
const HOME_QUEUE = [
  sampleJob({ id: "sample-job-2", job_number: 13, client_name: "Rosa Diaz", service_type: "Aircon cleaning" }),
];
const START_JOB = sampleJob({});
const ESTIMATE_JOB = sampleJob({
  status: "ESTIMATE_PENDING",
  started_at: hoursAgo(0.5),
  service_fee: 45,
  selected_products: [{ product_id: "p1", name: "Faucet cartridge", price: 18, quantity: 1 }],
});
const FINISH_JOB = sampleJob({
  status: "IN_PROGRESS",
  started_at: hoursAgo(1),
  quote_submitted_at: hoursAgo(0.8),
  quote_approved_at: hoursAgo(0.7),
  total_invoice_amount: 63,
  service_fee: 45,
  payment_status: "PAID",
  payment_verified_amount: 63,
  selected_products: [{ product_id: "p1", name: "Faucet cartridge", price: 18, quantity: 1 }],
});

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether this computer/phone is currently in dark mode — what "Auto" follows. */
export function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => true
  );
}

/** One real screen, shrunk into a phone. Nothing inside it can be clicked or focused. */
function PhoneScreen({ shop, dark, children }: { shop: Shop; dark: boolean; children: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: FRAME_W, height: Math.round(SCREEN_H * SCALE) }}
    >
      <div
        inert
        data-app-theme={dark ? "dark" : "light"}
        className="app-preview pointer-events-none absolute left-0 top-0 origin-top-left select-none overflow-hidden"
        style={{
          width: SCREEN_W,
          height: SCREEN_H,
          transform: `scale(${SCALE})`,
          ...brandStyle(shop.primary_color_hex, shop.accent_color_hex, shop.mobile_app_font_family),
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The technician app as this shop's technicians will see it. `shop` is the
 * saved shop with the builder's unsaved choices laid over it.
 */
export default function TechAppPreview({ shop, dark }: { shop: Shop; dark: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-6 md:justify-start">
      <PhoneFrame label="Home">
        <PhoneScreen shop={shop} dark={dark}>
          <TechHomeScreen
            preview
            shop={shop}
            staffContext={SAMPLE_STAFF}
            task={HOME_TASK}
            queue={HOME_QUEUE}
            stats={{ completedToday: 2, completedTotal: 31 }}
            onOpenTask={noop}
            onOpenTicket={noop}
            onOpenMessages={noop}
            onRefresh={noop}
          />
          <TechBottomNav active="jobs" onSelect={noop} />
        </PhoneScreen>
      </PhoneFrame>

      <PhoneFrame label="Starting a job">
        <PhoneScreen shop={shop} dark={dark}>
          <TechJobScreen preview shop={shop} ticket={START_JOB} onBack={noop} onSubmitted={noop} />
        </PhoneScreen>
      </PhoneFrame>

      <PhoneFrame label="On-site estimate">
        <PhoneScreen shop={shop} dark={dark}>
          <TechJobScreen preview shop={shop} ticket={ESTIMATE_JOB} onBack={noop} onSubmitted={noop} />
        </PhoneScreen>
      </PhoneFrame>

      <PhoneFrame label="Finishing a job">
        <PhoneScreen shop={shop} dark={dark}>
          <TechJobScreen preview shop={shop} ticket={FINISH_JOB} onBack={noop} onSubmitted={noop} />
        </PhoneScreen>
      </PhoneFrame>
    </div>
  );
}
