"use client";

import { useSyncExternalStore } from "react";
import { Camera, CheckCircle2, Lock, MapPin, PenLine, Plus, ShieldCheck } from "lucide-react";

export type GeofenceMode = "strict" | "standard" | "custom" | "off";

/** Everything the phone previews depend on — live form values, saved or not. */
export type PreviewSettings = {
  shopName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  /** Already resolved: "Auto" has been turned into the viewer's own light/dark. */
  dark: boolean;
  requirePhotos: boolean;
  liveCameraOnly: boolean;
  requireSignature: boolean;
  geofenceMode: GeofenceMode;
  geofenceMeters: number;
  showPrices: boolean;
  allowAdditions: boolean;
  currency: string;
};

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

function palette(dark: boolean) {
  return dark
    ? {
        page: "bg-brand-navy",
        card: "bg-white/5",
        text: "text-white",
        muted: "text-slate-400",
        faint: "text-slate-500",
        line: "border-white/15",
        chip: "bg-white/10",
      }
    : {
        page: "bg-slate-100",
        card: "bg-white shadow-sm",
        text: "text-slate-900",
        muted: "text-slate-500",
        faint: "text-slate-400",
        line: "border-slate-300",
        chip: "bg-slate-200",
      };
}

function geofenceLabel(s: PreviewSettings): string {
  return s.geofenceMode === "off"
    ? "Location check is off"
    : `GPS verified · within ${s.geofenceMeters} m of the job site`;
}

function money(s: PreviewSettings, amount: number) {
  return `${s.currency} ${amount.toFixed(2)}`;
}

function ShopMark({ s, size = "h-5 w-5" }: { s: PreviewSettings; size?: string }) {
  if (s.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={s.logoUrl} alt="" className={`${size} shrink-0 rounded object-cover`} />;
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded bg-white/25 text-[8px] font-bold text-white`}
    >
      {(s.shopName || "S").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function StaffLoginPreview({ s }: { s: PreviewSettings }) {
  return (
    <div
      style={{ backgroundColor: s.primaryColor, fontFamily: s.fontFamily }}
      className="flex h-[380px] flex-col items-center justify-center gap-3 px-5 text-center"
    >
      {s.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logoUrl} alt="" className="h-14 w-14 rounded-xl bg-white/15 object-cover" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-bold text-white">
          SP
        </span>
      )}
      <p className="text-sm font-bold text-white">{s.shopName || "ShopPulse"}</p>
      <p className="text-[10px] text-white/60">
        Sign in with the Google account your shop owner added you with.
      </p>
      <span className="mt-2 w-full rounded-full bg-white py-2 text-[10px] font-semibold text-slate-700">
        Continue with Google
      </span>
    </div>
  );
}

export function StaffJobListPreview({ s }: { s: PreviewSettings }) {
  const p = palette(s.dark);
  const jobs = [
    { name: "Apex Property Services", status: "SCHEDULED", price: 180 },
    { name: "Maria Santos", status: "IN_PROGRESS", price: 95.5 },
    { name: "Oakwood HOA", status: "COMPLETED", price: 240 },
  ];
  return (
    <div className={`h-[380px] ${p.page}`} style={{ fontFamily: s.fontFamily }}>
      <div
        style={{ backgroundColor: s.primaryColor }}
        className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-white"
      >
        <ShopMark s={s} />
        <span className="truncate">{s.shopName || "ShopPulse"}</span>
      </div>
      <div className="space-y-2 p-3">
        {jobs.map((job) => (
          <div key={job.name} className={`rounded-lg p-2.5 ${p.card}`}>
            <div className="flex items-start justify-between gap-2">
              <p className={`text-[11px] font-semibold ${p.text}`}>{job.name}</p>
              {s.showPrices && (
                <span className={`shrink-0 text-[10px] font-bold ${p.text}`}>
                  {money(s, job.price)}
                </span>
              )}
            </div>
            <span
              style={{ backgroundColor: `${s.accentColor}33`, color: s.accentColor }}
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold"
            >
              {job.status}
            </span>
          </div>
        ))}
        {!s.showPrices && (
          <p className={`flex items-center gap-1 px-1 pt-1 text-[9px] ${p.faint}`}>
            <Lock className="h-2.5 w-2.5" /> Prices are hidden from technicians
          </p>
        )}
      </div>
    </div>
  );
}

export function StaffVerificationPreview({ s }: { s: PreviewSettings }) {
  const p = palette(s.dark);
  const photoTag = s.requirePhotos ? "Required" : "Optional";
  return (
    <div style={{ fontFamily: s.fontFamily }} className={`h-[380px] space-y-2.5 p-3.5 ${p.page}`}>
      <p className={`text-[11px] font-semibold ${p.muted}`}>JOB VERIFICATION PROTOCOL</p>
      <label className={`flex items-center gap-2 text-[11px] ${p.muted}`}>
        <input
          type="checkbox"
          readOnly
          checked
          className="accent-current"
          style={{ accentColor: s.accentColor }}
        />
        Tools &amp; Safety Gear Inspected
      </label>

      <div className="grid grid-cols-2 gap-1.5">
        {["Before", "After"].map((label) => (
          <div
            key={label}
            className={`flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border border-dashed ${p.line} ${p.card}`}
          >
            <Camera className={`h-3.5 w-3.5 ${p.muted}`} />
            <span className={`text-[9px] font-semibold ${p.text}`}>{label} photo</span>
            <span
              className="rounded-full px-1.5 py-px text-[8px] font-bold"
              style={
                s.requirePhotos
                  ? { backgroundColor: `${s.accentColor}33`, color: s.accentColor }
                  : undefined
              }
            >
              <span className={s.requirePhotos ? "" : p.faint}>{photoTag}</span>
            </span>
          </div>
        ))}
      </div>

      <div
        style={{ backgroundColor: s.primaryColor }}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-semibold text-white"
      >
        <Camera className="h-3.5 w-3.5" />
        {s.requirePhotos ? "Take Live Photo Proof" : "Add a Photo (optional)"}
      </div>
      <p className={`text-center text-[9px] ${p.muted}`}>
        {s.liveCameraOnly ? "Live camera only — gallery uploads are blocked" : "Gallery uploads are allowed"}
      </p>

      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
        {s.geofenceMode === "off" ? (
          <span className={`flex items-center gap-1.5 ${p.muted}`}>
            <MapPin className="h-3 w-3" />
            {geofenceLabel(s)}
          </span>
        ) : (
          <span className="flex items-center gap-1.5" style={{ color: s.accentColor }}>
            <ShieldCheck className="h-3 w-3" />
            {geofenceLabel(s)}
          </span>
        )}
      </div>

      {s.requireSignature && (
        <div className={`rounded-md border border-dashed p-2 ${p.line}`}>
          <p className={`flex items-center gap-1 text-[9px] font-semibold ${p.muted}`}>
            <PenLine className="h-3 w-3" /> Customer signature required
          </p>
          <div className={`mt-1 h-6 rounded ${p.chip}`} />
        </div>
      )}

      <div
        style={{ backgroundColor: s.accentColor }}
        className="w-full rounded-lg py-2.5 text-center text-[11px] font-bold text-white"
      >
        CLOCK IN &amp; START JOB
      </div>
    </div>
  );
}

export function StaffQuotePreview({ s }: { s: PreviewSettings }) {
  const p = palette(s.dark);
  const diagnostic = 45;
  const parts = [
    { name: "Pipe fitting", qty: 2, price: 12 },
    { name: "Sealant tape", qty: 1, price: 6.5 },
  ];
  const total = diagnostic + parts.reduce((sum, part) => sum + part.qty * part.price, 0);
  return (
    <div style={{ fontFamily: s.fontFamily }} className={`h-[380px] space-y-2.5 p-3.5 ${p.page}`}>
      <p className="text-[11px] font-semibold uppercase" style={{ color: s.accentColor }}>
        Create On-Site Estimate
      </p>
      <p className={`text-[9px] ${p.muted}`}>Diagnose the issue, then send the customer a quote.</p>

      {s.showPrices && (
        <div className={`flex items-center justify-between rounded-md px-2.5 py-2 ${p.card}`}>
          <span className={`text-[10px] ${p.muted}`}>Diagnostic Fee</span>
          <span className={`text-[10px] font-bold ${p.text}`}>{money(s, diagnostic)}</span>
        </div>
      )}

      {s.allowAdditions ? (
        <div className="space-y-1.5">
          <p className={`text-[9px] font-semibold uppercase ${p.faint}`}>Parts Needed</p>
          {parts.map((part) => (
            <div
              key={part.name}
              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 ${p.card}`}
            >
              <span className={`text-[10px] ${p.text}`}>
                {part.name}
                {part.qty > 1 ? ` ×${part.qty}` : ""}
              </span>
              {s.showPrices && (
                <span className={`text-[10px] font-semibold ${p.text}`}>
                  {money(s, part.qty * part.price)}
                </span>
              )}
            </div>
          ))}
          <div
            className={`flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-[10px] font-semibold ${p.line}`}
            style={{ color: s.accentColor }}
          >
            <Plus className="h-3 w-3" /> Add parts / line items
          </div>
        </div>
      ) : (
        <p className={`rounded-md px-2.5 py-2 text-[9px] ${p.card} ${p.muted}`}>
          Your shop adds parts and extra charges for you — just send the standard estimate.
        </p>
      )}

      {s.showPrices ? (
        <div className={`flex items-center justify-between rounded-md px-2.5 py-2 ${p.card}`}>
          <span className={`text-[10px] ${p.muted}`}>Estimated Total</span>
          <span className="text-xs font-bold" style={{ color: s.accentColor }}>
            {money(s, s.allowAdditions ? total : diagnostic)}
          </span>
        </div>
      ) : (
        <p className={`flex items-center gap-1 text-[9px] ${p.faint}`}>
          <Lock className="h-2.5 w-2.5" /> Prices are hidden from technicians
        </p>
      )}

      <div
        style={{ backgroundColor: s.primaryColor }}
        className="w-full rounded-lg py-2.5 text-center text-[11px] font-bold text-white"
      >
        Send Estimate to Customer
      </div>
    </div>
  );
}

export function CustomerPortalPreview({ s }: { s: PreviewSettings }) {
  const p = palette(s.dark);
  return (
    <div style={{ fontFamily: s.fontFamily }} className={`h-[380px] ${p.page}`}>
      <div
        style={{ backgroundColor: s.primaryColor }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <ShopMark s={s} size="h-4 w-4" />
        <span className="truncate text-[11px] font-bold text-white">
          Job Verification &mdash; {s.shopName || "ShopPulse"}
        </span>
      </div>
      <div className="space-y-2.5 p-3">
        <p className={`text-[10px] ${p.muted}`}>Service: Residential Deep Clean</p>
        <p className={`text-[10px] ${p.muted}`}>Time Tracked: 2.5 Hours (14:00 - 16:30)</p>
        {s.geofenceMode !== "off" && (
          <p style={{ color: s.accentColor }} className="text-[10px] font-semibold">
            ✓ GPS Verified On-Site
          </p>
        )}
        {s.requirePhotos && (
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`aspect-square rounded-md ${p.chip}`} />
            <div className={`aspect-square rounded-md ${p.chip}`} />
          </div>
        )}
        {s.requireSignature && (
          <p className={`flex items-center gap-1 text-[10px] font-medium ${p.muted}`}>
            <PenLine className="h-3 w-3" /> Customer signature on file
          </p>
        )}
        <div
          className="rounded-lg px-3 py-2 text-[10px] font-medium"
          style={{ backgroundColor: `${s.accentColor}1A`, color: s.accentColor }}
        >
          <CheckCircle2 className="mb-1 h-3.5 w-3.5" />
          Work is done — {s.shopName || "the business"} is reviewing it before finalizing.
        </div>
        <p className={`pt-1 text-[11px] font-medium ${p.text}`}>Rate this job</p>
        <div className="flex gap-1 text-amber-400">{"★★★★★"}</div>
      </div>
    </div>
  );
}
